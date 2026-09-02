// B2B service catalog — single source of truth for the new platform taxonomy.
// Used by the landing lead form, admin labels, and (Phase 3) the bot funnel.

export type B2BServiceKind =
  | 'labor'
  | 'materials'
  | 'marketing'
  | 'ai_agents'
  | 'crm'
  | 'automation'
  | 'agency'
  | 'tender_parser'
  | 'scraping';

export interface ServiceBlock {
  id: string;
  title: string;
  items: Array<{ kind: B2BServiceKind; label: string; hint: string }>;
}

export const SERVICE_BLOCKS: ServiceBlock[] = [
  {
    id: 'materials-labor',
    title: 'Материалы и рабочая сила',
    items: [
      { kind: 'labor', label: 'Рабочая сила', hint: 'Бригады, грузчики, разнорабочие, строители' },
      { kind: 'materials', label: 'Материалы', hint: 'Стройматериалы с доставкой' },
    ],
  },
  {
    id: 'marketing-ai',
    title: 'Маркетинг и ИИ',
    items: [
      { kind: 'marketing', label: 'Маркетинг и продвижение', hint: 'Рассылки, выдача в нейросетях, Яндекс Дзен' },
      { kind: 'ai_agents', label: 'ИИ-менеджеры и агенты', hint: 'Создание ИИ-сотрудников' },
      { kind: 'crm', label: 'CRM', hint: 'Подключение и настройка' },
      { kind: 'automation', label: 'Автоматизация процессов', hint: 'Оптимизация бизнес-процессов' },
    ],
  },
  {
    id: 'sales-data',
    title: 'Продажи и данные',
    items: [
      { kind: 'agency', label: 'Агентские услуги', hint: 'Продажи и закупка' },
      { kind: 'tender_parser', label: 'Парсер тендеров', hint: 'Бесплатный поиск тендеров и аукционов' },
      { kind: 'scraping', label: 'Скрапинг и лидоген', hint: 'Поиск импортёров / покупателей за рубежом' },
    ],
  },
];

export const SERVICE_KINDS: B2BServiceKind[] = SERVICE_BLOCKS.flatMap((b) =>
  b.items.map((i) => i.kind),
);

export const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_BLOCKS.flatMap((b) => b.items).map((i) => [i.kind, i.label]),
);

export function serviceHint(kind: string): string {
  for (const b of SERVICE_BLOCKS) {
    const item = b.items.find((i) => i.kind === kind);
    if (item) return item.hint;
  }
  return '';
}
