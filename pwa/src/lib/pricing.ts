import { type SupabaseClient } from '@supabase/supabase-js';

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

    const { data } = await q.maybeSingle();
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
 * Calculates order totals from line items.
 * - comboDiscount = 15% of customerTotal if ≥2 different listingTypes present.
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
  const hasCombo = uniqueListingTypes.size >= 2;

  let comboDiscount = 0;
  if (hasCombo) {
    const raw = Math.round(rawCustomerTotal * 0.15 * 100) / 100;
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
