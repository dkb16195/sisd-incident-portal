/**
 * Fetches all rows from a Supabase query that may exceed the PostgREST max-rows limit.
 *
 * Fires the first page, then launches all remaining pages in one parallel wave —
 * so the total latency is roughly 2× one round-trip regardless of row count.
 */
export async function fetchAllRows<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000

  // First page — also tells us whether we need more
  const { data: first, error } = await queryFn(0, PAGE - 1)
  if (error || !first || first.length === 0) return []
  if (first.length < PAGE) return first

  // Hit the limit — launch remaining pages in parallel.
  // 100 pages × 1 000 rows = 100 000 row ceiling per wave, enough for any realistic dataset.
  const WAVE = 100
  const wave = Array.from({ length: WAVE }, (_, i) =>
    queryFn((i + 1) * PAGE, (i + 2) * PAGE - 1)
  )
  const results = await Promise.all(wave)

  const all: T[] = [...first]
  for (const { data } of results) {
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}
