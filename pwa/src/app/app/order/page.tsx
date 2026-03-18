import OrderForm from '@/components/OrderForm';
import EquipmentUpsell from '@/components/EquipmentUpsell';
import MessengerLinks from '@/components/MessengerLinks';
import PageHeader from '@/components/PageHeader';

export default function OrderPage() {
  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="➕ Новый заказ" subtitle="Заполните форму или напишите боту" />

      <div className="p-4 space-y-5 max-w-md mx-auto pb-6">
        {/* Messenger shortcuts */}
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-brand-700">Быстрее через мессенджер</p>
              <p className="text-xs text-brand-500/70 mt-0.5">
                Просто напишите боту — ИИ всё распознает
              </p>
            </div>
          </div>
          <MessengerLinks action="order" variant="inline" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400 font-medium">или заполните форму</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <OrderForm />

        <EquipmentUpsell />
      </div>
    </div>
  );
}
