'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Send, RefreshCw, Upload, X, Play, Pause, Trash2, Users, Activity, CheckCircle, XCircle, Power, PowerOff, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface InviteAccount {
  id: string;
  phone: string;
  label: string;
  is_default: boolean;
}

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
  inviter_account?: { id: string; phone: string; label: string } | null;
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
  const [accounts, setAccounts] = useState<InviteAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [workerActive, setWorkerActive] = useState(false);
  const [workerToggling, setWorkerToggling] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const [targetType, setTargetType] = useState<'channel' | 'chat'>('channel');
  const [targetId, setTargetId] = useState(process.env.NEXT_PUBLIC_INVITE_DEFAULT_TARGET_ID || '');
  const [targetName, setTargetName] = useState('');
  const [dailyLimit, setDailyLimit] = useState('15');
  const [inviterAccountId, setInviterAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invites', { headers: { 'x-admin-pin': pin } });
      const data = await res.json();
      if (res.ok) {
        setLists(data.lists || []);
        setAccounts(data.accounts || []);
        setWorkerActive(data.worker?.is_active ?? false);
        if (data.accounts?.length > 0 && !inviterAccountId) {
          const def = data.accounts.find((a: InviteAccount) => a.is_default);
          setInviterAccountId(def?.id || data.accounts[0].id);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!inviterAccountId) { setError('Выберите аккаунт для инвайтинга'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('target_type', targetType);
      fd.append('target_id', targetId);
      fd.append('target_name', targetName || targetId);
      fd.append('daily_limit', dailyLimit);
      fd.append('inviter_account_id', inviterAccountId);
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

      {/* ============================================================ */}
      {/*  Инструкция по инвайтингу                                    */}
      {/* ============================================================ */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-card">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-500" />
            Как работает инвайтинг — пошаговая инструкция
          </h2>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </button>

        {guideOpen && (
          <div className="mt-5 space-y-5 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-dark-border pt-5">
            {/* Шаг 1 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">1</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Подготовка CSV-файла</h3>
              </div>
              <div className="ml-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                <p>Файл должен содержать колонки с Telegram ID пользователей, которых вы хотите пригласить. Поддерживаются форматы <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">.csv</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">.xlsx</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">.xls</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">.txt</code>.</p>
                <p><strong>Обязательная колонка:</strong> <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">ID</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">user_id</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">telegram_id</code> или <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">id</code> — числовой Telegram ID пользователя.</p>
                <p><strong>Опционально:</strong> <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">Username</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">First Name</code>, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">Last Name</code> — для вашего удобства (отображаются в логах).</p>
                <p className="text-xs text-gray-400 mt-1">
                  Разделители: запятая, точка с запятой или табуляция. Пример: <code className="bg-gray-100 dark:bg-dark-border px-1 py-0.5 rounded text-xs">ID,Username,First Name,Last Name</code>
                </p>
              </div>
            </div>

            {/* Шаг 2 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">2</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Настройка технического аккаунта Telegram (MTProto)</h3>
              </div>
              <div className="ml-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                <p><strong>ВНИМАНИЕ:</strong> используйте <u>отдельный</u> технический номер телефона, <u>не ваш основной</u> аккаунт. Telegram может забанить аккаунт за массовые приглашения — не рискуйте личным.</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Зайдите на <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">my.telegram.org</a> и авторизуйтесь под техническим номером</li>
                  <li>Перейдите в <strong>API Development</strong></li>
                  <li>Создайте приложение (любое название, например «Inviter»)</li>
                  <li>Сохраните полученные <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">api_id</code> (число) и <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">api_hash</code> (строка)</li>
                  <li>Добавьте их в файл <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">.env</code> на VPS:</li>
                </ol>
                <pre className="bg-gray-50 dark:bg-dark-bg rounded-lg p-3 text-xs font-mono overflow-x-auto mt-1">
{`TELEGRAM_MT_PROTO_API_ID=12345678
TELEGRAM_MT_PROTO_API_HASH=a1b2c3d4e5f6...
INVITE_ACCOUNT_PHONE=+79991234567`}
                </pre>
                <p className="text-xs text-gray-400 mt-1">
                  Добавьте этот же номер в поле «Аккаунт для инвайтинга» в форме загрузки списка ниже.
                </p>
              </div>
            </div>

            {/* Шаг 3 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">3</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Загрузка списка в админ-панель</h3>
              </div>
              <div className="ml-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                <ol className="list-decimal ml-4 space-y-1">
                  <li><strong>Выберите CSV/XLSX файл</strong> с Telegram ID (кнопка «Нажмите для выбора файла»)</li>
                  <li><strong>Тип цели:</strong> выберите «Канал» (channel) или «Чат / супергруппа» (chat)</li>
                  <li><strong>ID канала/чата:</strong> введите числовой ID (например, <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">-1001234567890</code>)
                    <p className="text-xs text-gray-400 mt-0.5">
                      Как узнать ID: перешлите любое сообщение из нужного канала/чата боту <code className="bg-gray-100 dark:bg-dark-border px-1 py-0.5 rounded text-xs">@getidsbot</code> или <code className="bg-gray-100 dark:bg-dark-border px-1 py-0.5 rounded text-xs">@username_to_id_bot</code>
                    </p>
                  </li>
                  <li><strong>Дневной лимит:</strong> сколько приглашений в день отправлять (рекомендуется 15–20, чтобы избежать блокировки Telegram)</li>
                  <li><strong>Аккаунт для инвайтинга:</strong> выберите технический аккаунт из выпадающего списка</li>
                  <li>Нажмите <strong>«Загрузить и создать список»</strong></li>
                </ol>
              </div>
            </div>

            {/* Шаг 4 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">4</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Запуск воркера на VPS</h3>
              </div>
              <div className="ml-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                <p><strong>Воркер — это отдельный процесс, который выполняется на VPS.</strong> Он подключается к Telegram через MTProto и отправляет приглашения. Воркер НЕ запускается автоматически — его нужно запустить вручную.</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Подключитесь к VPS по SSH</li>
                  <li>Перейдите в папку проекта: <code className="bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded text-xs">cd ~/app/pwa</code></li>
                  <li>Запустите воркер:</li>
                </ol>
                <pre className="bg-gray-50 dark:bg-dark-bg rounded-lg p-3 text-xs font-mono overflow-x-auto mt-1">
npx tsx scripts/invite-worker.ts
</pre>
                <p className="text-xs text-gray-400 mt-1">
                  При <strong>первом запуске</strong> воркер запросит код подтверждения из Telegram — введите его в консоль. Сессия сохранится в файл <code className="bg-gray-100 dark:bg-dark-border px-1 py-0.5 rounded text-xs">invite-worker.session</code> и при следующих запусках код запрашиваться не будет.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Рекомендуется запускать воркер через <code className="bg-gray-100 dark:bg-dark-border px-1 py-0.5 rounded text-xs">pm2</code> или <code className="bg-gray-100 dark:bg-dark-border px-1 py-0.5 rounded text-xs">screen</code>, чтобы он не останавливался при закрытии SSH-сессии.
                </p>
              </div>
            </div>

            {/* Шаг 5 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">5</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Запуск и мониторинг</h3>
              </div>
              <div className="ml-8 space-y-1.5 text-gray-600 dark:text-gray-400">
                <p>После того как воркер запущен на VPS, управление происходит из админ-панели:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li><strong>Активируйте список:</strong> нажмите зелёную кнопку ▶ на карточке нужного списка в разделе «Списки инвайтинга» (статус изменится на «Активен»)</li>
                  <li><strong>Запустите воркер:</strong> нажмите кнопку «Запустить» в блоке «Воркер» (индикатор станет зелёным)</li>
                  <li><strong>Следите за прогрессом:</strong> в карточке списка отображается прогресс-бар и счётчики:
                    <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                      <li><span className="text-green-600 font-medium">Приглашено</span> — успешно отправленные приглашения</li>
                      <li><span className="text-red-500 font-medium">Ошибок</span> — неудачные попытки (пользователь заблокировал бота, неверный ID и т.п.)</li>
                      <li><span className="text-gray-400 font-medium">Пропущено</span> — превышен дневной лимит</li>
                    </ul>
                  </li>
                </ol>
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  <strong>Важно:</strong> Telegram ограничивает количество приглашений. Рекомендуется дневной лимит 15–20, задержка между приглашениями 60–300 секунд (настраивается в воркере автоматически). При превышении лимитов аккаунт может быть временно заблокирован.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
              placeholder={`Например: -1001234567890`}
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
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">
              Аккаунт для инвайтинга
            </label>
            {accounts.length === 0 ? (
              <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
                Нет добавленных аккаунтов. Добавьте технический аккаунт через SQL (таблица invite_accounts) или обратитесь к разработчику.
              </div>
            ) : (
              <select
                value={inviterAccountId}
                onChange={e => setInviterAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-surface text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                required
              >
                <option value="" disabled>Выберите аккаунт...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.label} ({acc.phone})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Технический Telegram-аккаунт, через который будут отправляться приглашения
            </p>
          </div>

          <div className="md:col-span-2">
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            {result && <p className="text-green-600 text-sm mb-2">{result}</p>}
            <button
              type="submit"
              disabled={uploading || !file || !inviterAccountId}
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
                        {list.inviter_account && (
                          <> &middot; {list.inviter_account.label} ({list.inviter_account.phone})</>
                        )}
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
