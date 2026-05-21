'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

const HIDDEN_ON = [
  '/admin',
  '/login',
  '/register',
  '/executor/register',
  '/privacy',
  '/offline',
  '/install',
];

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hidden =
    HIDDEN_ON.includes(pathname) ||
    /^\/order\/[^/]+\/confirm/.test(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/');

  if (hidden) return <>{children}</>;

  return (
    <>
      <div className="pb-16 md:pb-0">{children}</div>
      <BottomNav />
    </>
  );
}
