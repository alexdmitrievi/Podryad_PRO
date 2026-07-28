#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Подряд PRO — UFW Firewall Setup (Docker-compatible)
# ═══════════════════════════════════════════════════════════════
#
# SAFETY: Run this script ONLY on the VPS, NOT on a local machine.
# It will configure UFW to work alongside Docker without breaking
# Docker's virtual networks (docker0, br-*).
#
# Usage:
#   chmod +x scripts/setup-firewall.sh
#   sudo ./scripts/setup-firewall.sh
#
# ═══════════════════════════════════════════════════════════════

set -e

echo "=== Подряд PRO — UFW Firewall Setup ==="
echo ""

# ── 1. Reset UFW to clean state ──
echo "[1/5] Resetting UFW..."
ufw --force reset > /dev/null 2>&1

# ── 2. Default policies ──
echo "[2/5] Setting default policies..."
ufw default deny incoming
ufw default allow outgoing
# Docker needs forwarding — set before enabling
ufw default allow forward
# Allow established/related connections for Docker
ufw default allow routed

# ── 3. Allow essential ports ──
echo "[3/5] Allowing essential ports..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 8443/tcp comment 'HTTPS-alt (nginx)'

# ── 4. Allow Docker bridge networks (critical: prevent INPUT DROP breaking Docker) ──
echo "[4/5] Configuring Docker network rules..."

# Get Docker bridge subnet (usually 172.17.0.0/16)
DOCKER_BRIDGE=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "172.17.0.0/16")
echo "  Docker bridge subnet: ${DOCKER_BRIDGE}"

# Allow all traffic on docker0 and br-* interfaces
# These rules are ADDED TO THE TOP of the chain to take precedence over default DENY
cat > /etc/ufw/before.rules.docker << 'DOCKER_RULES'
# Docker bridge interfaces — allow all traffic within Docker networks
*nat
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
COMMIT

*filter
:INPUT ACCEPT [0:0]

# Allow established connections
-A ufw-before-input -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Allow Docker bridge (docker0)
-A ufw-before-input -i docker0 -j ACCEPT

# Allow Docker compose networks (br-*)
-A ufw-before-input -i br-+ -j ACCEPT

# Allow localhost
-A ufw-before-input -i lo -j ACCEPT

COMMIT
DOCKER_RULES

echo "  Docker rules written to /etc/ufw/before.rules.docker"

# ── 5. Enable UFW ──
echo "[5/5] Enabling UFW..."
echo "y" | ufw enable

echo ""
echo "=== UFW Status ==="
ufw status numbered
echo ""
echo "=== Docker containers (verify they still work) ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  Docker not running or no containers"
echo ""
echo "✅ UFW configured with Docker compatibility."
echo "   Verify: curl -I https://podryadpro.ru should return 200/301."
