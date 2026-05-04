import { type SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';

const DEFAULT_MARKUP = 15;

/**
 * Looks up the markup rate for a listing from the markup_rates table.
 * Priority: subcategory > category > listing_type. Fallback: 15%.
 */
export async function getMarkupRate(
  supabase: SupabaseClient,
  listingType: string,
  category?: string,
  subcategory?: string
): Promise<number> {
  const queries: Array<{ listing_type: string; category?: string; subcategory?: string }> = [];

  if (subcategory && category) {
    queries.push({ listing_type: listingType, category, subcategory });
  }
  if (category) {
    queries.push({ listing_type: listingType, category });
  }
  queries.push({ listing_type: listingType });

  for (const filter of queries) {
    let q = supabase
      .from('markup_rates')
      .select('markup_percent')
      .eq('listing_type', filter.listing_type);

    if (filter.subcategory) {
      q = q.eq('subcategory', filter.subcategory);
    } else {
      q = q.is('subcategory', null);
    }

    if (filter.category) {
      q = q.eq('category', filter.category);
    } else {
      q = q.is('category', null);
    }

    const { data, error } = await q.maybeSingle();
    if (error) {
      log.warn('[Pricing] DB error fetching markup, using default', { listingType, category: filter?.category, error: String(error) });
    }
    if (data?.markup_percent != null) {
      return Number(data.markup_percent);
    }
  }

  return DEFAULT_MARKUP;
}

/**
 * Applies markup to a base price.
 * displayPrice = Math.ceil(basePrice * (1 + markupPercent / 100) / 5) * 5
 */
export function applyMarkup(
  basePrice: number,
  markupPercent: number
): { basePrice: number; displayPrice: number; markupPercent: number } {
  const displayPrice = Math.ceil((basePrice * (1 + markupPercent / 100)) / 5) * 5;
  return { basePrice, displayPrice, markupPercent };
}

export interface OrderItem {
  baseUnitPrice: number;
  displayUnitPrice: number;
  quantity: number;
  listingType: string;
}

export interface OrderItemResult extends OrderItem {
  lineTotal: number;
  supplierLine: number;
}

export interface OrderTotals {
  customerTotal: number;
  supplierPayout: number;
  platformMargin: number;
  comboDiscount: number;
  items: OrderItemResult[];
}

/**
 * Returns combo discount rate based on which service types are combined.
 * - labor + equipment = 15%
 * - labor + materials = 10%
 * - equipment + materials = 10%
 * - labor + equipment + materials = 20%
 */
export function getComboDiscountRate(listingTypes: Set<string>): number {
  const hasLabor = listingTypes.has('labor');
  const hasEquipment = listingTypes.has('equipment') || listingTypes.has('equipment_rental');
  const hasMaterials = listingTypes.has('materials') || listingTypes.has('material');

  if (hasLabor && hasEquipment && hasMaterials) return 0.20;
  if (hasLabor && hasEquipment) return 0.15;
  if (hasLabor && hasMaterials) return 0.10;
  if (hasEquipment && hasMaterials) return 0.10;
  return 0;
}

/**
 * Calculates order totals from line items.
 * - comboDiscount uses tiered rates based on which listingTypes are combined.
 * - Protection: combo discount is capped so platform always earns ≥3% of supplierPayout.
 */
export function calculateOrderTotals(items: OrderItem[]): OrderTotals {
  const enriched: OrderItemResult[] = items.map((item) => ({
    ...item,
    lineTotal: item.displayUnitPrice * item.quantity,
    supplierLine: item.baseUnitPrice * item.quantity,
  }));

  const rawCustomerTotal = enriched.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawSupplierPayout = enriched.reduce((sum, i) => sum + i.supplierLine, 0);

  const uniqueListingTypes = new Set(items.map((i) => i.listingType));
  const comboRate = getComboDiscountRate(uniqueListingTypes);

  let comboDiscount = 0;
  if (comboRate > 0) {
    const raw = Math.round(rawCustomerTotal * comboRate * 100) / 100;
    const grossMargin = rawCustomerTotal - rawSupplierPayout;
    // Ensure platform keeps at least 3% of supplierPayout after discount
    const maxDiscount = Math.max(grossMargin - rawSupplierPayout * 0.03, 0);
    comboDiscount = Math.min(raw, maxDiscount);
  }

  const customerTotal = Math.round((rawCustomerTotal - comboDiscount) * 100) / 100;
  const supplierPayout = rawSupplierPayout;
  const platformMargin = Math.round((customerTotal - supplierPayout) * 100) / 100;

  return { customerTotal, supplierPayout, platformMargin, comboDiscount, items: enriched };
}
