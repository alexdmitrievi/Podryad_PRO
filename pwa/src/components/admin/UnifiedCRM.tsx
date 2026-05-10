'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Mail, MessageCircle, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface BotLead {
  id: string;
  contact_id: string;
  status: string;
  name: string | null;
  email: string | null;
  messenger: string | null;
  telegram: string | null;
  comment: string | null;
  admin_notes: string | null;
  conversation_summary: string | null;
  source: string;
  channel: string;
  city: string | null;
  address: string | null;
  price_quoted: number | null;
  price_final: number | null;
  contact_attempts: number;
  next_followup_at: string | null;
  last_contacted_at: string | null;
  converted_at: string | null;
  order_id: string | null;
  service_kind: string;
  created_at: string;
  updated_at: string;
  bot_contacts?: { full_name: string | null; phone: string | null; city: string | null };
}

const STATUS_OPTIONS = ['new', 'qualifying', 'qualified', 'quoted', 'scheduled', 'in_progress', 'done', 'lost', 'archived'];
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  qualifying: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  quoted: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  scheduled: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const SOURCE_LABELS: Record<string, string> = { bot: '🤖 Бот', landing: '🌐 Лендинг', avito: '📦 Avito', manual: '✍️ Ручной', referral: '🔗 Реферал' };
const CHANNEL_LABELS: Record<string, string> = { telegram: '📱 TG', max: '💬 MAX', offline: '📞 Офлайн', phone: '📞 Тел', avito: '📦 Avito' };

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function fmtMoney(val: number | null): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(val) + ' ₽';
}

export default function UnifiedCRMTab({ pin }: { pin: string }) {
  const [leads, setLeads] = useState<BotLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; text: string } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/bot-leads?${params}`, { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, statusFilter, sourceFilter, search, pin]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, fields: Record<string, any>) => {
    try {
      await fetch('/api/admin/bot-leads', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ id, ...fields }),
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...fields } : l));
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['new', 'qualifying', 'quoted', 'scheduled', 'done'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`p-3 rounded-xl border text-center transition-all ${statusFilter === s ? 'border-[#2F5BFF] bg-[#2F5BFF]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
            <div className="text-lg font-bold">{leads.filter(l => l.status === s).length}</div>
            <div className="text-xs text-gray-500 mt-1">{STATUS_OPTIONS.find(x => x === s)}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            placeholder="Поиск по имени, телефону, заметкам..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={e => e.key === 'Enter' && fetchLeads()}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
          <option value="">Все источники</option>
          <option value="bot">Бот</option>
          <option value="landing">Лендинг</option>
          <option value="avito">Avito</option>
          <option value="manual">Ручной</option>
          <option value="referral">Реферал</option>
        </select>
        <span className="text-sm text-gray-500">Всего: {total}</span>
      </div>

      {/* Leads list */}
      <div className="space-y-3">
        {loading && <div className="text-center py-8 text-gray-400">Загрузка...</div>}
        {!loading && leads.length === 0 && <div className="text-center py-8 text-gray-400">Нет лидов</div>}
        {leads.map(lead => {
          const contact = lead.bot_contacts;
          const isExpanded = expandedId === lead.id;
          return (
            <div key={lead.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all">
              {/* Header */}
              <div className="p-4 flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}>{lead.status}</span>
                    <span className="text-xs text-gray-400">{SOURCE_LABELS[lead.source] || lead.source}</span>
                    <span className="text-xs text-gray-400">{CHANNEL_LABELS[lead.channel] || lead.channel}</span>
                  </div>
                  <div className="font-semibold mt-1">{lead.name || contact?.full_name || 'Без имени'}</div>
                  <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    {contact?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                    {lead.city && <span>{lead.city}</span>}
                    {lead.price_quoted && <span className="text-green-600 font-medium">{fmtMoney(lead.price_quoted)}</span>}
                    <span className="text-xs text-gray-400">{fmtDate(lead.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lead.next_followup_at && <span className="text-xs text-amber-500" title="Фоллоу-ап">🔔 {fmtDate(lead.next_followup_at)}</span>}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-400">Статус</span>
                      <select value={lead.status} onChange={e => updateLead(lead.id, { status: e.target.value })}
                        className="w-full mt-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><span className="text-gray-400">Цена</span>
                      <input type="number" placeholder="Цена" defaultValue={lead.price_quoted ?? ''}
                        onBlur={e => updateLead(lead.id, { price_quoted: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full mt-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
                    </div>
                    <div><span className="text-gray-400">Фоллоу-ап</span>
                      <input type="datetime-local" defaultValue={lead.next_followup_at?.slice(0, 16) ?? ''}
                        onChange={e => updateLead(lead.id, { next_followup_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full mt-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
                    </div>
                    <div><span className="text-gray-400">Попытки</span>
                      <div className="mt-1 font-mono">{lead.contact_attempts}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Телефон</span><div>{contact?.phone || '—'}</div></div>
                    <div><span className="text-gray-400">Email</span><div>{lead.email || '—'}</div></div>
                    <div><span className="text-gray-400">Мессенджер</span><div>{lead.messenger || '—'}</div></div>
                    <div><span className="text-gray-400">Telegram</span><div>{lead.telegram || '—'}</div></div>
                    <div><span className="text-gray-400">Город</span><div>{lead.city || contact?.city || '—'}</div></div>
                    <div><span className="text-gray-400">Адрес</span><div>{lead.address || '—'}</div></div>
                    <div className="col-span-2"><span className="text-gray-400">Комментарий</span><div className="text-gray-600">{lead.comment || '—'}</div></div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">Заметки админа</span>
                    <textarea
                      defaultValue={lead.admin_notes ?? ''}
                      onBlur={e => updateLead(lead.id, { admin_notes: e.target.value })}
                      placeholder="Добавить заметку..."
                      rows={2}
                      className="w-full mt-1 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none"
                    />
                  </div>

                  {lead.conversation_summary && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400 text-xs block mb-1">AI Сводка</span>
                      {lead.conversation_summary}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 text-sm">← Назад</button>
          <span className="text-sm text-gray-500">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 text-sm">Вперёд →</button>
        </div>
      )}
    </div>
  );
}
