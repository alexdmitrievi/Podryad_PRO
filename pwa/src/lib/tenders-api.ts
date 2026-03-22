const base = () =>
  process.env.NEXT_PUBLIC_TENDER_API_URL?.replace(/\/$/, '') || '';

export type TenderListResponse = {
  items: Record<string, unknown>[];
  page: number;
  page_size: number;
  total: number;
};

export async function fetchTenders(params: URLSearchParams): Promise<TenderListResponse | null> {
  const b = base();
  if (!b) return null;
  const res = await fetch(`${b}/api/tenders?${params.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchStats(): Promise<Record<string, unknown> | null> {
  const b = base();
  if (!b) return null;
  const res = await fetch(`${b}/api/stats`, { next: { revalidate: 120 } });
  if (!res.ok) return null;
  return res.json();
}
