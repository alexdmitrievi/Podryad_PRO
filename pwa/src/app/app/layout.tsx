import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-1 overflow-hidden pt-16">{children}</div>
      <BottomNav />
    </div>
  );
}
