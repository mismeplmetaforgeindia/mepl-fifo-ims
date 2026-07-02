import type { SupabaseClient } from "@supabase/supabase-js";

// PostgREST caps a single response at ~1000 rows, so page through to get
// everything (GRN/issues exceed 1000). Server-side only.
export async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  select = "*",
  order?: { column: string; ascending?: boolean },
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
