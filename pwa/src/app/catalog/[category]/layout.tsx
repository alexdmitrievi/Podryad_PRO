import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Каталог услуг | Подряд PRO',
  description:
    'Каталог строительных услуг: рабочая сила, аренда техники, стройматериалы в Омске и Новосибирске. Заказать онлайн — оплата по СБП или счёту.',
  openGraph: {
    title: 'Каталог услуг | Подряд PRO',
    description: 'Рабочие, техника, стройматериалы — заказать онлайн',
  },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
