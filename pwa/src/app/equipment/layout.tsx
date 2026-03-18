import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Аренда строительного инструмента и садовой техники в Омске — Подряд PRO',
  description:
    'Прокат газонокосилок, перфораторов, бензопил, снегоуборщиков в Омске. Почасовая и суточная аренда. Доставка по городу. Скидка 15% при заказе исполнителей.',
};

export default function EquipmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
