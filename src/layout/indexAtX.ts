/**
 * The character boundary (0..text.length) whose left edge is closest to `x` px,
 * given a text-width function. Used to turn a pointer position into a chord anchor.
 */
export function indexAtX(text: string, x: number, measure: (s: string) => number): number {
  if (x <= 0 || text.length === 0) return 0;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (measure(text.slice(0, mid)) < x) lo = mid + 1;
    else hi = mid;
  }
  // lo = first boundary at or right of x; compare with the one before it
  if (lo === 0) return 0;
  const left = measure(text.slice(0, lo - 1));
  const right = measure(text.slice(0, lo));
  return x - left <= right - x ? lo - 1 : lo;
}
