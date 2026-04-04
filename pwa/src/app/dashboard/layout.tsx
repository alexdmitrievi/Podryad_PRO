import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Активные заказы на карте | Подряд PRO',
  description:
    'Дашборд с активными заказами на строительные работы, аренду техники и материалы в Омске и Новосибирске. Откликнитесь на подходящий заказ.',
  openGraph: {
    title: 'Активные заказы на карте | Подряд PRO',
    description: 'Смотрите заказы на карте и откликайтесь на подходящие предложения',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
