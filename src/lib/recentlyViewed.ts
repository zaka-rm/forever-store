const KEY = 'recentlyViewed'
const MAX = 8

/** Reads the list of recently-viewed product ids, most recent first. */
export function getViewed(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Records a product as just viewed (moves it to the front, capped at MAX). */
export function trackViewed(id: string): void {
  try {
    const next = [id, ...getViewed().filter((x) => x !== id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}
