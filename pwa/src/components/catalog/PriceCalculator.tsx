'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';

type TabType = 'labor' | 'material' | 'equipment_rental';

const TAB_LABELS: Record<TabType, string> = {
  labor: 'Работники',
  material: 'Материалы',
  equipment_rental: 'Техника',
};

export default function PriceCalculator() {
  const [activeTab, setActiveTab] = useState<TabType>('labor');
  const [people, setPeople] = useState(2);
  const [hours, setHours] = useState(4);
  const [volume, setVolume] = useState(10);
  const [days, setDays] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState('');

  // Base display prices (per unit)
  const LABOR_RATE = 575; // ₽/час за человека
  const MATERIAL_RATE = 3200; // ₽/м³
  const EQUIPMENT_RATE = 2100; // ₽/час

  const laborTotal = people * hours * LABOR_RATE;
  const materialTotal = volume * MATERIAL_RATE;
  const equipmentTotal = days * 8 * EQUIPMENT_RATE;

  const totals: Record<TabType, number> = {
    labor: laborTotal,
    material: materialTotal,
    equipment_rental: equipmentTotal,
  };

  const total = totals[activeTab];

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-brand-500" />
        <h3 className="font-bold text-gray-900 dark:text-white">Калькулятор стоимости</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg rounded-xl p-1 mb-4">
        {(Object.entries(TAB_LABELS) as [TabType, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === value
                ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-dark-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sliders */}
      {activeTab === 'labor' && (
        <div className="space-y-4">
          <SliderRow
            label="Количество человек"
            value={people}
            min={1} max={20}
            onChange={setPeople}
            suffix="чел"
          />
          <SliderRow
            label="Количество часов"
            value={hours}
            min={1} max={12}
            onChange={setHours}
            suffix="ч"
          />
        </div>
      )}

      {activeTab === 'material' && (
        <SliderRow
          label="Объём материала"
          value={volume}
          min={1} max={100}
          onChange={setVolume}
          suffix="м³"
        />
      )}

      {activeTab === 'equipment_rental' && (
        <SliderRow
          label="Срок аренды"
          value={days}
          min={1} max={30}
          onChange={setDays}
          suffix="дн"
        />
      )}

      {/* Total */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-dark-border">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Итого</span>
          <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {total.toLocaleString('ru-RU')} ₽
          </span>
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
          >
            Получить расчёт
          </button>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); alert(`Звонок на ${phone}`); setShowForm(false); }}
            className="flex gap-2"
          >
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              required
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 rounded-xl transition-all cursor-pointer"
            >
              Отправить
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, onChange, suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-dark-muted">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{value} {suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500 cursor-pointer"
      />
    </div>
  );
}
