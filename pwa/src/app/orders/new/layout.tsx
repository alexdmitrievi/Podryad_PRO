import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Заказать рабочих | Подряд PRO',
  description:
    'Заполните форму заказа на рабочую силу: грузчики, разнорабочие, строители, благоустройство. Укажите адрес на карте и получите бригаду за 15 минут.',
  openGraph: {
    title: 'Заказать рабочих | Подряд PRO',
    description: 'Закажите бригаду рабочих в Омске и Новосибирске — от 250 ₽/час',
  },
};

export default function NewOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
