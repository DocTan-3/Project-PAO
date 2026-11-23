import { useMemo, useState } from 'preact/hooks';
import type { Song } from '../model/types';
import { Icon } from './icons';
import { ThemeToggle } from './theme';

export function Library({
  songs,
  onOpen,
  onNew,
  onDelete,
}: {
  songs: Song[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  // Deleting takes two taps (hosted pages cannot show confirm dialogs).
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : songs;
  }, [songs, query]);

  return (
    <main class="library">
      <div class="lib-top">
        <div class="brand">
          <span class="brand-mark"><Icon name="note" size={22} /></span>
          Songbook
        </div>
        <ThemeToggle />
      </div>

      {songs.length > 0 && (
        <label class="search">
          <Icon name="search" size={20} />
          <input
            id="song-search"
            type="search"
            placeholder="Search songs or artists"
            value={query}
            autocomplete="off"
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            aria-label="Search songs"
          />
        </label>
      )}

      {songs.length === 0 && (
        <div class="empty">
          <div class="art"><Icon name="note" size={34} /></div>
          <h2>Your songbook is empty</h2>
          <p>Write your first song with chords above the lyrics.</p>
        </div>
      )}
      {songs.length > 0 && shown.length === 0 && (
        <div class="empty">
          <h2>No songs match “{query}”</h2>
          <p>Try a different title or artist.</p>
        </div>
      )}
      {shown.length > 0 && (
        <p class="lib-count">{query ? `${shown.length} of ${songs.length} songs` : `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}`}</p>
      )}

      <ul class="lib-list">
        {shown.map((s) => (
          <li key={s.id} class="lib-item">
            {confirmId === s.id ? (
              <div class="confirm" role="alertdialog" aria-label={`Delete ${s.title || 'Untitled'}?`}>
                <span>Delete “{s.title || 'Untitled'}” for good?</span>
                <button class="btn danger" onClick={() => { setConfirmId(null); onDelete(s.id); }}>Delete</button>
                <button class="btn" onClick={() => setConfirmId(null)}>Keep it</button>
              </div>
            ) : (
              <>
                <button class="song-card" onClick={() => onOpen(s.id)}>
                  <span class={`keybadge${s.key ? '' : ' none'}`}>{s.key ?? '–'}</span>
                  <span>
                    <span class="t">{s.title || 'Untitled'}</span>
                    <span class="a">{s.artist || 'No artist'}</span>
                  </span>
                  <span class="chev"><Icon name="next" size={20} /></span>
                </button>
                <button
                  class="btn icon ghost trash"
                  onClick={() => setConfirmId(s.id)}
                  aria-label={`Delete ${s.title || 'Untitled'}`}
                  title="Delete song"
                >
                  <Icon name="trash" size={20} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <button class="fab" onClick={onNew}>
        <Icon name="plus" size={22} />
        New song
      </button>
    </main>
  );
}
