'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OrderForm from '@/components/OrderForm';
import EquipmentUpsell from '@/components/EquipmentUpsell';
import PageHeader from '@/components/PageHeader';

export default function OrderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { authenticated?: boolean }) => {
        if (!data.authenticated) {
          router.replace('/auth/login?redirect=/app/order');
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        router.replace('/auth/login?redirect=/app/order');
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-dark-bg">
      <PageHeader title="Новый заказ" subtitle="Заполните форму — мы подберём исполнителя" />

      <div className="p-4 space-y-5 max-w-md mx-auto pb-6">
        <OrderForm />
        <EquipmentUpsell />
      </div>
    </div>
  );
}
