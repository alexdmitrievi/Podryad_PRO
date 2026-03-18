export interface EquipmentItem {
  id: string;
  name: string;
  category: 'garden' | 'construction' | 'special';
  description: string;
  specs: string;
  rate_4h: number;
  rate_day: number;
  rate_3days: number;
  deposit: number;
  available: boolean;
  image_placeholder: string;
}

export const EQUIPMENT_CATEGORIES = {
  garden: { label: 'Сад и участок', icon: '🌿', color: 'emerald' },
  construction: { label: 'Стройка и ремонт', icon: '🔨', color: 'amber' },
  special: { label: 'Спецтехника', icon: '⚡', color: 'blue' },
} as const;

export type EquipmentCategory = keyof typeof EQUIPMENT_CATEGORIES;

export const EQUIPMENT: EquipmentItem[] = [
  // ── Сад и участок ──
  {
    id: 'mower-1',
    name: 'Газонокосилка бензиновая самоходная',
    category: 'garden',
    description:
      'Для стрижки газонов на участках до 15 соток. Самоходная — не нужно толкать.',
    specs: 'Ширина скоса 46 см, бак 1 л, травосборник 60 л',
    rate_4h: 800,
    rate_day: 1200,
    rate_3days: 3000,
    deposit: 5000,
    available: true,
    image_placeholder: '🏎️',
  },
  {
    id: 'scarifier-1',
    name: 'Скарификатор-аэратор',
    category: 'garden',
    description:
      'Для аэрации и вычёсывания газона. Убирает мох и войлок.',
    specs: 'Ширина обработки 38 см, электрический',
    rate_4h: 600,
    rate_day: 900,
    rate_3days: 2200,
    deposit: 3000,
    available: true,
    image_placeholder: '🌱',
  },
  {
    id: 'trimmer-1',
    name: 'Триммер бензиновый',
    category: 'garden',
    description:
      'Для покоса травы в труднодоступных местах, вдоль заборов и дорожек.',
    specs: 'Двигатель 2-тактный, нож + леска',
    rate_4h: 500,
    rate_day: 800,
    rate_3days: 2000,
    deposit: 3000,
    available: true,
    image_placeholder: '🌾',
  },
  {
    id: 'hedger-1',
    name: 'Кусторез аккумуляторный',
    category: 'garden',
    description:
      'Для стрижки кустов и живой изгороди. Работает от аккумулятора — тихий и лёгкий.',
    specs: 'Длина шины 50 см, аккумулятор 18В 4Ач',
    rate_4h: 500,
    rate_day: 700,
    rate_3days: 1800,
    deposit: 3000,
    available: true,
    image_placeholder: '✂️',
  },
  {
    id: 'cultivator-1',
    name: 'Мотокультиватор',
    category: 'garden',
    description: 'Для вспашки и рыхления земли на грядках и клумбах.',
    specs: 'Ширина обработки 40 см, глубина до 25 см',
    rate_4h: 800,
    rate_day: 1200,
    rate_3days: 3000,
    deposit: 5000,
    available: true,
    image_placeholder: '🚜',
  },
  {
    id: 'chainsaw-1',
    name: 'Бензопила',
    category: 'garden',
    description:
      'Для спила деревьев, распиловки брёвен, заготовки дров.',
    specs: 'Шина 40 см, мощность 2.4 л.с.',
    rate_4h: 600,
    rate_day: 900,
    rate_3days: 2200,
    deposit: 4000,
    available: true,
    image_placeholder: '🪚',
  },
  {
    id: 'snowblower-1',
    name: 'Снегоуборщик',
    category: 'garden',
    description:
      'Для уборки снега на подъездных дорожках, парковках и дворах.',
    specs: 'Ширина захвата 56 см, дальность выброса до 10 м',
    rate_4h: 1000,
    rate_day: 1500,
    rate_3days: 3800,
    deposit: 5000,
    available: true,
    image_placeholder: '❄️',
  },

  // ── Стройка и ремонт ──
  {
    id: 'hammer-drill-1',
    name: 'Перфоратор',
    category: 'construction',
    description: 'Для сверления и долбления бетона, кирпича, камня.',
    specs: 'SDS-Plus, 800Вт, 3 режима, кейс + набор буров',
    rate_4h: 400,
    rate_day: 600,
    rate_3days: 1500,
    deposit: 3000,
    available: true,
    image_placeholder: '🔩',
  },
  {
    id: 'grinder-1',
    name: 'УШМ (болгарка) 230 мм',
    category: 'construction',
    description: 'Для резки металла, бетона, плитки. Большой диск 230 мм.',
    specs: '2200Вт, диск 230 мм, плавный пуск',
    rate_4h: 400,
    rate_day: 600,
    rate_3days: 1500,
    deposit: 3000,
    available: true,
    image_placeholder: '💿',
  },
  {
    id: 'tile-cutter-1',
    name: 'Плиткорез электрический',
    category: 'construction',
    description:
      'Для точной резки керамической плитки и керамогранита.',
    specs: 'Длина реза до 60 см, водяное охлаждение',
    rate_4h: 500,
    rate_day: 800,
    rate_3days: 2000,
    deposit: 4000,
    available: true,
    image_placeholder: '🧱',
  },
  {
    id: 'vacuum-1',
    name: 'Строительный пылесос',
    category: 'construction',
    description:
      'Для уборки строительной пыли, стружки, мелкого мусора.',
    specs: 'Мощность 1400Вт, бак 30 л, розетка для инструмента',
    rate_4h: 400,
    rate_day: 600,
    rate_3days: 1500,
    deposit: 3000,
    available: true,
    image_placeholder: '🫧',
  },
  {
    id: 'heat-gun-1',
    name: 'Строительный фен',
    category: 'construction',
    description:
      'Для снятия краски, усадки термоусадки, сварки линолеума.',
    specs: '2000Вт, температура до 600°C, 3 насадки',
    rate_4h: 300,
    rate_day: 500,
    rate_3days: 1200,
    deposit: 2000,
    available: true,
    image_placeholder: '🔥',
  },
  {
    id: 'toolkit-1',
    name: 'Универсальный набор инструмента',
    category: 'construction',
    description:
      'Полный набор ручного инструмента для ремонтных и отделочных работ.',
    specs: '120+ предметов: ключи, отвёртки, плоскогубцы, головки, биты',
    rate_4h: 300,
    rate_day: 500,
    rate_3days: 1200,
    deposit: 3000,
    available: true,
    image_placeholder: '🧰',
  },

  // ── Спецтехника ──
  {
    id: 'pressure-washer-1',
    name: 'Мойка высокого давления',
    category: 'special',
    description:
      'Для мойки машин, фасадов, заборов, дорожек, садовой мебели.',
    specs: 'Давление до 150 бар, шланг 8 м, 3 насадки',
    rate_4h: 600,
    rate_day: 1000,
    rate_3days: 2500,
    deposit: 4000,
    available: true,
    image_placeholder: '💦',
  },
  {
    id: 'generator-1',
    name: 'Бензогенератор 3 кВт',
    category: 'special',
    description:
      'Для питания электроинструмента на объектах без электричества.',
    specs: '3 кВт, бак 15 л, работа до 10 часов, 2 розетки 220В',
    rate_4h: 800,
    rate_day: 1200,
    rate_3days: 3000,
    deposit: 5000,
    available: true,
    image_placeholder: '⚡',
  },
];

export const DELIVERY_PRICE = 500;
export const COMBO_DISCOUNT = 0.15;
