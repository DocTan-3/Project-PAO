import { useMemo } from 'preact/hooks';
import { LANGUAGES, groupSongs } from '../model/library';
import type { Song } from '../model/types';
import { useFavorites } from './favorites';
import { Icon } from './icons';
import { ThemeToggle } from './theme';

export function FavoritesPage({ songs, onMenu, onOpen }: { songs: Song[]; onMenu: () => void; onOpen: (id: string) => void }) {
  const ids = useFavorites();
  const list = useMemo(() => {
    const mine = songs.filter((s) => ids.includes(s.id));
    return LANGUAGES.flatMap((l) => groupSongs(mine, l.id).flatMap((g) => g.songs));
  }, [songs, ids]);
  return (
    <main class="library favorites">
      <div class="lib-pinned">
        <div class="lib-top">
          <div class="brand">
            <button class="btn icon ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
            Favorites
          </div>
          <div class="lib-actions"><ThemeToggle /></div>
        </div>
      </div>

      {list.length === 0 ? (
        <div class="empty" id="favorites-empty">
          <div class="art"><Icon name="heart" size={34} /></div>
          <h2>No favorites yet</h2>
          <p>Open a song and tap the heart to keep it here.</p>
        </div>
      ) : (
        <ul class="lib-list" id="favorites-list">
          {list.map((s) => (
            <li key={s.id} class="lib-item">
              <button class="song-card" onClick={() => onOpen(s.id)} aria-label={`${s.title || 'Untitled'}${s.artist ? `, ${s.artist}` : ''}`}>
                <span class={`keybadge${s.key ? '' : ' none'}`}>{s.key ?? '–'}</span>
                <span>
                  <span class="t">{s.title || 'Untitled'}</span>
                  <span class="a">{s.artist || 'No artist'}</span>
                </span>
                <span class="chev"><Icon name="next" size={20} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
