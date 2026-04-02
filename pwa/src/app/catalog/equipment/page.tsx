import CatalogView from '@/components/catalog/CatalogView';

export const metadata = { title: 'Аренда техники — Подряд PRO' };

export default function EquipmentCatalogPage() {
  return <CatalogView type="equipment_rental" />;
}
