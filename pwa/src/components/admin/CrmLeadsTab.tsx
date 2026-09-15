"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Ban, PhoneCall, X } from "lucide-react";

const STATUSES = ["new", "analyzed", "cp_drafted", "cp_approved", "sent", "replied", "call", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  new: "Новая",
  analyzed: "Проанализирована",
  cp_drafted: "КП готово",
  cp_approved: "КП одобрено",
  sent: "Отправлено",
  replied: "Ответил",
  call: "🤝 Перехвачено",
  won: "✅ Сделка",
  lost: "❌ Потерян",
};
const STATUS_COLORS: Record<Status, string> = {
  new: "bg-gray-100 text-gray-700",
  analyzed: "bg-blue-100 text-blue-700",
  cp_drafted: "bg-indigo-100 text-indigo-700",
  cp_approved: "bg-violet-100 text-violet-700",
  sent: "bg-amber-100 text-amber-700",
  replied: "bg-cyan-100 text-cyan-700",
  call: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-600",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "📧 Email",
  telegram: "✈️ TG",
  max: "💬 MAX",
  whatsapp: "🟢 WA",
  vk: "🔵 VK",
  wechat: "🟡 WeChat",
};

interface Company {
  id: number;
  company_name_en: string;
  company_name_zh: string;
  province: string;
  city: string;
  website: string;
  domain: string;
  phones: string[];
  whatsapp: string;
  industry_guess: string;
  source_name: string;
}

interface Lead {
  id: number;
  company_id: number;
  niche: string;
  status: Status;
  channel: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  company: Company | null;
}

interface DecisionMaker {
  id: number;
  name: string;
  role: string;
  contact_type: string;
  contact_value: string;
}

interface OutreachTask {
  id: number;
  channel: string;
  status: string;
  subject: string;
  body: string;
  to_address: string;
  sent_at: string | null;
}

interface LeadMessage {
  id: number;
  channel: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
}

interface AiTask {
  id: number;
  task_type: string;
  input: string;
  output: string;
  model: string;
  created_at: string;
}

interface SuppressionRow {
  id: number;
  channel: string;
  identifier: string;
  reason: string;
  created_at: string;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function companyName(c: Company | null): string {
  if (!c) return "—";
  return c.company_name_en || c.company_name_zh || c.domain || `#${c.id}`;
}

export default function CrmLeadsTab({ pin }: { pin: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Lead | null>(null);
  const [detail, setDetail] = useState<{
    company: Company | null;
    decision_makers: DecisionMaker[];
    tasks: OutreachTask[];
    messages: LeadMessage[];
    ai_tasks: AiTask[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [supp, setSupp] = useState<SuppressionRow[]>([]);
  const [suppChannel, setSuppChannel] = useState("email");
  const [suppId, setSuppId] = useState("");
  const [suppReason, setSuppReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/crm/leads?${params}`, { headers: { "x-admin-pin": pin } });
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setFunnel(data.funnel || {});
        setTotal(data.total || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [pin, statusFilter, search]);

  const loadSupp = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/suppression", { headers: { "x-admin-pin": pin } });
      const data = await res.json();
      if (res.ok) setSupp(data.items || []);
    } catch {
      /* ignore */
    }
  }, [pin]);

  useEffect(() => {
    load();
    loadSupp();
  }, [load, loadSupp]);

  async function openLead(lead: Lead) {
    setSelected(lead);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/leads/${lead.id}`, { headers: { "x-admin-pin": pin } });
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(lead: Lead, status: Status) {
    await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ status }),
    });
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    if (selected?.id === lead.id) setSelected({ ...selected, status });
    load();
  }

  async function saveNotes(lead: Lead, notes: string) {
    await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ admin_notes: notes }),
    });
    setSelected({ ...lead, admin_notes: notes });
  }

  async function handoff(lead: Lead) {
    await fetch(`/api/admin/crm/leads/${lead.id}/handoff`, { method: "POST", headers: { "x-admin-pin": pin } });
    changeStatus(lead, "call");
  }

  async function addSuppression() {
    if (!suppId.trim()) return;
    await fetch("/api/admin/suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ channel: suppChannel, identifier: suppId.trim(), reason: suppReason }),
    });
    setSuppId("");
    setSuppReason("");
    loadSupp();
  }

  async function removeSuppression(id: number) {
    await fetch(`/api/admin/suppression?id=${id}`, { method: "DELETE", headers: { "x-admin-pin": pin } });
    loadSupp();
  }

  return (
    <div className="space-y-4">
      {/* Funnel chips */}
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
            className={`p-3 rounded-xl border text-center transition-all ${
              statusFilter === s ? "border-brand-500 bg-brand-500/5" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="text-lg font-bold">{funnel[s] ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium cursor-pointer disabled:opacity-50">
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> Обновить
        </button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: компания, домен, ниша..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <span className="text-sm text-gray-500">Всего: {total}</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-dark-border">
              {["Компания", "Ниша", "Канал", "Статус", "Обновлён", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border cursor-pointer" onClick={() => openLead(l)}>
                <td className="px-4 py-3">
                  <div className="font-medium">{companyName(l.company)}</div>
                  <div className="text-xs text-gray-400">{l.company?.city || "—"}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.niche || "—"}</td>
                <td className="px-4 py-3">{CHANNEL_LABELS[l.channel] || l.channel || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => changeStatus(l, e.target.value as Status)}
                    className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer ${STATUS_COLORS[l.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">{fmt(l.updated_at)}</td>
                <td className="px-4 py-3 text-brand-500 font-medium">Открыть →</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Нет лидов</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-2xl h-full bg-white dark:bg-dark-bg overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{companyName(selected.company)}</h3>
                <div className="text-sm text-gray-500">
                  {selected.company?.website || selected.company?.domain || "—"} · {selected.company?.city || "—"}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => handoff(selected)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold cursor-pointer">
                <PhoneCall className="w-4 h-4" /> Перехватить
              </button>
              <button
                onClick={() => { setSuppId(selected.company?.domain || ""); setSuppChannel("email"); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold cursor-pointer"
              >
                <Ban className="w-4 h-4" /> В стоп-лист
              </button>
              <select
                value={selected.status}
                onChange={(e) => changeStatus(selected, e.target.value as Status)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer ${STATUS_COLORS[selected.status]}`}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Заметки</label>
              <textarea
                defaultValue={selected.admin_notes || ""}
                onBlur={(e) => saveNotes(selected, e.target.value)}
                rows={2}
                placeholder="Заметки по лиду..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            {detailLoading && <p className="text-sm text-gray-400">Загрузка...</p>}

            {detail && (
              <div className="space-y-4">
                {/* Decision makers */}
                {detail.decision_makers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold mb-2">ЛПР / контакты</h4>
                    {detail.decision_makers.map((dm) => (
                      <div key={dm.id} className="text-sm py-1 border-b border-gray-100 dark:border-dark-border">
                        <span className="font-medium">{dm.name || "—"}</span> · {dm.role || "—"} · {dm.contact_type}:{" "}
                        <span className="font-mono">{dm.contact_value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outreach tasks (КП) */}
                {detail.tasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold mb-2">КП / рассылка</h4>
                    {detail.tasks.map((t) => (
                      <div key={t.id} className="border border-gray-100 dark:border-dark-border rounded-xl p-3 mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-brand-500">{t.status}</span>· {t.channel} · {fmt(t.sent_at)}
                        </div>
                        {t.subject && <div className="font-medium text-sm">{t.subject}</div>}
                        <div className="text-xs text-gray-500 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">{t.body}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dialogue */}
                <div>
                  <h4 className="text-sm font-bold mb-2">Диалог</h4>
                  {detail.messages.length === 0 && <p className="text-sm text-gray-400">Переписки пока нет</p>}
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`mb-2 p-3 rounded-xl max-w-[90%] ${m.direction === "in" ? "bg-gray-100 dark:bg-dark-border mr-auto" : "bg-brand-50 dark:bg-brand-500/10 ml-auto"}`}
                    >
                      <div className="text-xs text-gray-400 mb-1">{m.direction === "in" ? "← Лид" : "→ Мы"} · {m.channel} · {fmt(m.created_at)}</div>
                      <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    </div>
                  ))}
                </div>

                {/* AI analysis */}
                {detail.ai_tasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold mb-2">Разборы ИИ</h4>
                    {detail.ai_tasks.map((a) => (
                      <div key={a.id} className="text-xs mb-2">
                        <span className="font-semibold text-violet-600">{a.task_type}</span> · {a.model} · {fmt(a.created_at)}
                        <p className="text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{a.output}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stop-list */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card p-4">
        <h3 className="font-bold mb-3">Стоп-лист (глобальный)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={suppChannel} onChange={(e) => setSuppChannel(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-sm">
            {["email", "telegram", "max", "whatsapp", "phone", "any"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={suppId} onChange={(e) => setSuppId(e.target.value)} placeholder="email / id / телефон" className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-sm flex-1 min-w-[200px]" />
          <input value={suppReason} onChange={(e) => setSuppReason(e.target.value)} placeholder="причина" className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-sm w-40" />
          <button onClick={addSuppression} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold cursor-pointer">Добавить</button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {supp.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 dark:border-dark-border">
              <span><span className="font-mono">{s.channel}</span>: {s.identifier} {s.reason && <span className="text-gray-400">· {s.reason}</span>}</span>
              <button onClick={() => removeSuppression(s.id)} className="text-red-500 hover:underline text-xs cursor-pointer">удалить</button>
            </div>
          ))}
          {supp.length === 0 && <p className="text-sm text-gray-400">Пусто</p>}
        </div>
      </div>
    </div>
  );
}
