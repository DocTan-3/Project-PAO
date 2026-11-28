/** Favourite songs: a list of song ids kept on this phone only. Updates from the admin never change it. */
const KEY = 'pao:favorites';

export function favoriteIds(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The list with this song added (or removed when it was already in it). Pure, so it is easy to test. */
export function toggled(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function toggleFavorite(id: string): boolean {
  const next = toggled(favoriteIds(), id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the heart just won't stick */
  }
  dispatchEvent(new Event('pao:favorites-changed'));
  return next.includes(id);
}
