import { useEffect, useState } from 'preact/hooks';
import { favoriteIds } from '../model/favorites';

/** The favourite song ids, refreshed whenever the heart is tapped. */
export function useFavorites(): string[] {
  const [ids, setIds] = useState(favoriteIds);
  useEffect(() => {
    const h = () => setIds(favoriteIds());
    addEventListener('pao:favorites-changed', h);
    return () => removeEventListener('pao:favorites-changed', h);
  }, []);
  return ids;
}
