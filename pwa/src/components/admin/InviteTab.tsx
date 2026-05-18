'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Send, RefreshCw, Upload, X, Play, Pause, Trash2, Users, Activity, CheckCircle, XCircle, Power, PowerOff } from 'lucide-react';

interface InviteList {
  id: string;
  filename: string;
  target_type: string;
  target_id: string;
  target_name: string;
  total_count: number;
  processed_count: number;
  invited_count: number;
  failed_count: number;
  skipped_count: number;
  daily_limit: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активен',
  paused: 'На паузе',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function InviteTab({ pin }: { pin: string }) {
  const [lists, setLists] = useState<InviteList[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [workerActive, setWorkerActive] = useState(false);
  const [workerToggling, setWorkerToggling] = useState(false);

  const [targetType, setTargetType] = useState<'channel' | 'chat'>('channel');
  const [targetId, setTargetId] = useState(process.env.NEXT_PUBLIC_INVITE_DEFAULT_TARGET_ID || '');
  const [targetName, setTargetName] = useState('');
  const [dailyLimit, setDailyLimit] = useState('15');
  const [file, setFile] = useState<File | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invites', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) {
        setLists(data.lists || []);
        setWorkerActive(data.worker?.is_active ?? false);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [pin]);

  useEffect(() => { loadLists(); }, [loadLists]);

  const updateStatus = async (listId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ list_id: listId, action }),
      });
      if (res.ok) loadLists();
    } catch { /* */ }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) { setError('Выберите файл'); return; }
    if (!targetId) { setError('Укажите ID канала/чата'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('target_type', targetType);
      fd.append('target_id', targetId);
      fd.append('target_name', targetName || targetId);
      fd.append('daily_limit', dailyLimit);
      fd.append('pin', pin);

      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
        body: fd,
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Список создан! ${data.total} пользователей в очереди.`);
        setFile(null);
        loadLists();
      } else {
        setError(data.error || 'Ошибка загрузки');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setUploading(false);
    }
  };

  const toggleWorker = async () => {
    setWorkerToggling(true);
    const action = workerActive ? 'worker_stop' : 'worker_start';
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ list_id: 'global', action }),
      });
      if (res.ok) {
        setWorkerActive(!workerActive);
      }
    } catch { /* */ }
    finally { setWorkerToggling(false); }
  };

  const canActivate = (list: InviteList) => list.status === 'draft' || list.status === 'paused';
  const canPause = (list: InviteList) => list.status === 'active';
  const canDelete = (list: InviteList) => list.status === 'draft' || list.status === 'completed' || list.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-500" />
          Загрузить список для инвайтинга
        </h2>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">CSV / Excel файл</label>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-dark-border bg-surface cursor-pointer hover:border-brand-500 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                {file ? file.name : 'Нажмите для выбора файла (.csv, .xlsx)'}
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={e => {
                  setFile(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Ожидаются колонки: ID, Username (опционально), Last Seen, Status
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">Тип цели</label>
            <select
              value={targetType}
              onChange={e => setTargetType(e.target.value as 'channel' | 'chat')}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="channel">Канал</option>
              <option value="chat">Чат (супергруппа)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">Дневной лимит</label>
            <input
              type="number"
              value={dailyLimit}
              onChange={e => setDailyLimit(e.target.value)}
              min={1}
              max={50}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">ID канала/чата</label>
            <input
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              placeholder={`Например: ${targetType === 'channel' ? '-1001234567890' : '-1001234567890'}`}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">Название (для заметки)</label>
            <input
              value={targetName}
              onChange={e => setTargetName(e.target.value)}
              placeholder="Например: Основной канал Омск"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="md:col-span-2">
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            {result && <p className="text-green-600 text-sm mb-2">{result}</p>}
            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Загрузка...</>
              ) : (
                <><Upload className="w-4 h-4" /> Загрузить и создать список</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Worker control */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${workerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Power className="w-5 h-5 text-brand-500" />
                Воркер
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {workerActive
                  ? 'Запущен — обрабатывает очередь'
                  : 'Остановлен — инвайтинг не выполняется'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWorker}
            disabled={workerToggling}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all disabled:opacity-50 ${
              workerActive
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'
            }`}
          >
            {workerToggling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : workerActive ? (
              <PowerOff className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {workerActive ? 'Остановить' : 'Запустить'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Воркер запускается отдельным процессом на VPS: <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded">npx tsx scripts/invite-worker.ts</code>.
          Кнопка выше включает/выключает обработку очереди.
        </p>
      </div>

      {/* Lists */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            Списки инвайтинга
          </h2>
          <button
            onClick={loadLists}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-gray-100 dark:hover:bg-dark-border text-sm text-gray-600 dark:text-gray-300 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>

        {lists.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
            Нет загруженных списков. Загрузите CSV/Excel файл выше.
          </p>
        ) : (
          <div className="space-y-3">
            {lists.map(list => {
              const pct = list.total_count > 0 ? Math.round((list.processed_count / list.total_count) * 100) : 0;
              return (
                <div key={list.id} className="border border-gray-100 dark:border-dark-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{list.filename}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[list.status] || 'bg-gray-100'}`}>
                          {STATUS_LABELS[list.status] || list.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {list.target_type === 'channel' ? 'Канал' : 'Чат'}: {list.target_name || list.target_id.slice(0, 12) + '…'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(list.created_at).toLocaleDateString('ru-RU')} &middot;
                        Лимит: {list.daily_limit}/день &middot;
                        Всего: {list.total_count}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canActivate(list) && (
                        <button onClick={() => updateStatus(list.id, 'activate')} title="Запустить"
                          className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 cursor-pointer transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {canPause(list) && (
                        <button onClick={() => updateStatus(list.id, 'pause')} title="Пауза"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 cursor-pointer transition-colors">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete(list) && (
                        <button onClick={() => updateStatus(list.id, 'delete')} title="Удалить"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Прогресс: {pct}%</span>
                      <span>{list.processed_count} / {list.total_count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {list.invited_count} приглашено
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-3.5 h-3.5" />
                      {list.failed_count} ошибок
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Activity className="w-3.5 h-3.5" />
                      {list.skipped_count} пропущено
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
