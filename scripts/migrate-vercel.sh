#!/usr/bin/env bash
# Vercel project migration: read everything from OLD account, recreate on NEW.
# Run locally (your machine, not in CI/sandbox).
#
# Usage:
#   OLD_TOKEN=vcp_xxx NEW_TOKEN=vcp_yyy bash scripts/migrate-vercel.sh export
#   OLD_TOKEN=vcp_xxx NEW_TOKEN=vcp_yyy bash scripts/migrate-vercel.sh import
#   OLD_TOKEN=vcp_xxx NEW_TOKEN=vcp_yyy bash scripts/migrate-vercel.sh all
#
# Stages:
#   export  read OLD account → dump to $WORK_DIR (no writes to new)
#   import  read $WORK_DIR    → create projects + env on NEW account
#   all     export then import sequentially
#
# After "import" you still need to do manually in Vercel UI:
#   - Remove domains from OLD account (Settings → Domains → Remove)
#   - Connect GitHub integration on NEW account (Settings → Git → Connect)
#   - Trigger first deployment

set -euo pipefail
umask 077

OLD_TOKEN="${OLD_TOKEN:-}"
NEW_TOKEN="${NEW_TOKEN:-}"
OLD_TEAM_SLUG="${OLD_TEAM_SLUG:-alexdmitrievis-projects}"
NEW_TEAM_SLUG="${NEW_TEAM_SLUG:-}"      # empty → personal scope
PROJECTS=("${PROJECTS_OVERRIDE:-podryad-pro parser}")
WORK_DIR="${WORK_DIR:-/tmp/vmig}"
VERCEL_BIN="${VERCEL_BIN:-vercel}"

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

require() { command -v "$1" >/dev/null 2>&1 || { red "missing dependency: $1"; exit 1; }; }

precheck() {
  [[ -z "$OLD_TOKEN" ]] && { red "set OLD_TOKEN env var"; exit 1; }
  [[ -z "$NEW_TOKEN" ]] && { red "set NEW_TOKEN env var"; exit 1; }
  require curl
  require jq
  if ! command -v "$VERCEL_BIN" >/dev/null 2>&1; then
    yellow "vercel CLI not found — installing (npm i -g vercel)..."
    npm i -g vercel || { red "failed to install vercel CLI"; exit 1; }
  fi
  CLI_VER=$("$VERCEL_BIN" --version 2>/dev/null | head -1 || true)
  echo "vercel CLI: $CLI_VER"
}

api() {
  # api <token> <method> <path>
  local tok=$1 method=$2 path=$3
  shift 3
  curl -fsS -X "$method" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    "https://api.vercel.com${path}" "$@"
}

resolve_team_id() {
  # resolve_team_id <token> <slug> → prints team id (or empty if slug empty / personal)
  local tok=$1 slug=$2
  [[ -z "$slug" ]] && { echo ""; return 0; }
  api "$tok" GET "/v2/teams" | jq -r --arg slug "$slug" '.teams[] | select(.slug==$slug) | .id'
}

stage_export() {
  bold "=== STAGE: EXPORT (OLD account → $WORK_DIR) ==="
  mkdir -p "$WORK_DIR"

  local who_old who_new
  who_old=$(api "$OLD_TOKEN" GET "/v2/user" | jq -r '.user.username // .user.email')
  who_new=$(api "$NEW_TOKEN" GET "/v2/user" | jq -r '.user.username // .user.email')
  echo "OLD user: $who_old"
  echo "NEW user: $who_new"
  [[ "$who_old" == "$who_new" ]] && yellow "WARN: OLD and NEW tokens belong to the SAME account. Continuing anyway."

  OLD_TEAM_ID=$(resolve_team_id "$OLD_TOKEN" "$OLD_TEAM_SLUG")
  echo "OLD team id: ${OLD_TEAM_ID:-<personal>}"
  echo "$OLD_TEAM_ID" > "$WORK_DIR/old_team_id.txt"

  local qs=""
  [[ -n "$OLD_TEAM_ID" ]] && qs="?teamId=$OLD_TEAM_ID"

  # List of projects on OLD account (for reference)
  api "$OLD_TOKEN" GET "/v9/projects${qs}" > "$WORK_DIR/_all_projects.json"
  green "Projects visible on OLD account: $(jq -r '.projects[].name' "$WORK_DIR/_all_projects.json" | tr '\n' ' ')"

  for PROJ in ${PROJECTS[@]}; do
    echo
    bold "--- $PROJ ---"
    local pdir="$WORK_DIR/$PROJ"
    mkdir -p "$pdir"

    # Project metadata
    if ! api "$OLD_TOKEN" GET "/v9/projects/$PROJ${qs}" > "$pdir/project.json" 2>/dev/null; then
      red "  not found on OLD account — skip"
      continue
    fi
    jq '{framework, rootDirectory, buildCommand, installCommand, outputDirectory, devCommand, nodeVersion, publicSource, autoExposeSystemEnvs}' \
      "$pdir/project.json" > "$pdir/build-settings.json"
    echo "  build settings:"; cat "$pdir/build-settings.json" | sed 's/^/    /'

    # Env vars (KEYS — values are encrypted in API response, pull decrypted via CLI below)
    api "$OLD_TOKEN" GET "/v9/projects/$PROJ/env${qs}" > "$pdir/env-meta.json"
    jq -r '.envs[] | "\(.key)\t\(.target | join(","))\t\(.type)\t\(.gitBranch // "")"' \
      "$pdir/env-meta.json" > "$pdir/env-meta.tsv"
    echo "  env var entries: $(wc -l < "$pdir/env-meta.tsv")"

    # Domains
    api "$OLD_TOKEN" GET "/v9/projects/$PROJ/domains${qs}" > "$pdir/domains.json"
    jq -r '.domains[].name' "$pdir/domains.json" > "$pdir/domains.txt"
    echo "  domains: $(tr '\n' ' ' < "$pdir/domains.txt")"

    # Pull DECRYPTED env values via CLI (writes .env.<env> files)
    local clidir="$pdir/cli"
    mkdir -p "$clidir"
    pushd "$clidir" >/dev/null
    local scope_flag=()
    [[ -n "$OLD_TEAM_SLUG" ]] && scope_flag=(--scope "$OLD_TEAM_SLUG")
    VERCEL_TOKEN="$OLD_TOKEN" "$VERCEL_BIN" link --yes --project "$PROJ" "${scope_flag[@]}" \
      >/dev/null 2>&1 || yellow "  link failed for $PROJ"
    for E in production preview development; do
      if VERCEL_TOKEN="$OLD_TOKEN" "$VERCEL_BIN" env pull --environment="$E" --yes ".env.$E" \
         >/dev/null 2>&1; then
        echo "  pulled .env.$E ($(wc -l < ".env.$E") vars)"
      else
        : > ".env.$E"
        echo "  .env.$E empty or pull failed"
      fi
    done
    popd >/dev/null
  done

  echo
  green "EXPORT done. Review files in $WORK_DIR before running import."
  yellow "Tokens stay in env vars only — no token written to disk."
}

stage_import() {
  bold "=== STAGE: IMPORT ($WORK_DIR → NEW account) ==="

  local NEW_TEAM_ID
  NEW_TEAM_ID=$(resolve_team_id "$NEW_TOKEN" "$NEW_TEAM_SLUG")
  echo "NEW team id: ${NEW_TEAM_ID:-<personal>}"
  local qs=""
  [[ -n "$NEW_TEAM_ID" ]] && qs="?teamId=$NEW_TEAM_ID"

  for PROJ in ${PROJECTS[@]}; do
    echo
    bold "--- $PROJ ---"
    local pdir="$WORK_DIR/$PROJ"
    [[ ! -d "$pdir" ]] && { yellow "  no dump for $PROJ — run export first"; continue; }

    # 1) Create the project (idempotent: skip if already exists)
    if api "$NEW_TOKEN" GET "/v9/projects/$PROJ${qs}" >/dev/null 2>&1; then
      yellow "  project $PROJ already exists on NEW account — reusing"
    else
      local create_body
      create_body=$(jq -n \
        --arg name "$PROJ" \
        --argjson bs "$(cat "$pdir/build-settings.json")" \
        '{name: $name} + ($bs | with_entries(select(.value != null and .value != "")))')
      echo "  creating project with body: $create_body"
      api "$NEW_TOKEN" POST "/v10/projects${qs}" -d "$create_body" > "$pdir/new-project.json" || {
        red "  CREATE failed — response:"; cat "$pdir/new-project.json" 2>/dev/null | head -c 500; echo; continue;
      }
      green "  created"
    fi

    # 2) Set env vars
    # For each env file, push values back. Read env-meta.tsv to know which target each KEY belongs to.
    declare -A TARGETS_FOR=()
    while IFS=$'\t' read -r KEY TARGETS TYPE GITBR; do
      [[ -z "$KEY" ]] && continue
      TARGETS_FOR["$KEY"]="$TARGETS"
    done < "$pdir/env-meta.tsv"

    for E in production preview development; do
      local file="$pdir/cli/.env.$E"
      [[ ! -s "$file" ]] && continue
      echo "  pushing $E env vars..."
      # parse KEY=VALUE lines (handle quoted values)
      while IFS= read -r LINE || [[ -n "$LINE" ]]; do
        [[ -z "$LINE" || "$LINE" =~ ^# ]] && continue
        local KEY="${LINE%%=*}"
        local VAL="${LINE#*=}"
        # strip surrounding quotes if present
        VAL="${VAL%\"}"; VAL="${VAL#\"}"
        # decide target list for this key (use original from meta if known, else just current env)
        local TGT_LIST="${TARGETS_FOR[$KEY]:-$E}"
        # Vercel API expects target as JSON array
        local TGT_JSON
        TGT_JSON=$(echo "$TGT_LIST" | tr ',' '\n' | jq -R . | jq -s . 2>/dev/null || echo '["production"]')
        # Only push for the *current* environment to avoid duplicate writes in same loop
        if echo "$TGT_LIST" | tr ',' '\n' | grep -q "^${E}$"; then
          local body
          body=$(jq -n --arg k "$KEY" --arg v "$VAL" --argjson t "[\"$E\"]" \
            '{key:$k, value:$v, target:$t, type:"encrypted"}')
          # delete existing first (idempotent)
          local existing_id
          existing_id=$(api "$NEW_TOKEN" GET "/v9/projects/$PROJ/env${qs}" \
            | jq -r --arg k "$KEY" --arg e "$E" \
              '.envs[] | select(.key==$k) | select(.target | index($e)) | .id' | head -1)
          [[ -n "$existing_id" ]] && api "$NEW_TOKEN" DELETE "/v9/projects/$PROJ/env/$existing_id${qs}" >/dev/null 2>&1 || true
          if api "$NEW_TOKEN" POST "/v10/projects/$PROJ/env${qs}" -d "$body" >/dev/null 2>&1; then
            echo "    $KEY → $E ✓"
          else
            red "    $KEY → $E ✗"
          fi
        fi
      done < "$file"
    done

    # 3) Add domains (will return 409 if owned by another account — that's expected)
    while read -r DOMAIN; do
      [[ -z "$DOMAIN" || "$DOMAIN" =~ \.vercel\.app$ ]] && continue
      echo "  attaching domain: $DOMAIN"
      api "$NEW_TOKEN" POST "/v10/projects/$PROJ/domains${qs}" \
        -d "$(jq -n --arg n "$DOMAIN" '{name:$n}')" > "$pdir/domain-add-$DOMAIN.json" || true
      local err
      err=$(jq -r '.error.code // empty' "$pdir/domain-add-$DOMAIN.json" 2>/dev/null)
      if [[ -n "$err" ]]; then
        yellow "    $DOMAIN: $err (likely owned by OLD account — remove from there first)"
      else
        green "    $DOMAIN attached"
      fi
    done < "$pdir/domains.txt"
  done

  echo
  green "IMPORT done."
  bold "Manual follow-up:"
  echo "  1) Vercel → OLD account → each project → Settings → Domains → Remove domain"
  echo "     (then re-run this script with stage=import to attach domains on NEW)"
  echo "  2) Vercel → NEW account → Settings → Git → Connect GitHub"
  echo "  3) Trigger first deploy: 'VERCEL_TOKEN=\$NEW_TOKEN vercel --prod' from each project root"
}

usage() {
  cat <<EOF
Usage: OLD_TOKEN=... NEW_TOKEN=... bash scripts/migrate-vercel.sh <stage>

Stages: export | import | all

Optional env:
  OLD_TEAM_SLUG   default: alexdmitrievis-projects
  NEW_TEAM_SLUG   default: (empty = personal scope)
  PROJECTS_OVERRIDE  space-separated list, default: "podryad-pro parser"
  WORK_DIR        default: /tmp/vmig
EOF
}

main() {
  local stage="${1:-}"
  case "$stage" in
    export) precheck; stage_export ;;
    import) precheck; stage_import ;;
    all)    precheck; stage_export; stage_import ;;
    *)      usage; exit 1 ;;
  esac
}

main "$@"
