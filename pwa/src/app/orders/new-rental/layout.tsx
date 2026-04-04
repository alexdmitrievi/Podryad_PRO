import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Арендовать технику | Подряд PRO',
  description:
    'Аренда строительной техники в Омске и Новосибирске: экскаваторы, погрузчики, виброплиты, бензопилы. С оператором и без.',
  openGraph: {
    title: 'Арендовать технику | Подряд PRO',
    description: 'Арендуйте строительную технику — от 400 ₽/сутки',
  },
};

export default function NewRentalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
