import type { Song } from '../model/types';

export function Library({ songs, onOpen }: { songs: Song[]; onOpen: (id: string) => void }) {
  return (
    <main class="library">
      <h1>Songs</h1>
      {songs.length === 0 && <p class="muted">No songs yet.</p>}
      <ul>
        {songs.map((s) => (
          <li key={s.id}>
            <button class="song-card" onClick={() => onOpen(s.id)}>
              <span class="t">{s.title || 'Untitled'}</span>
              <span class="a">{s.artist}</span>
              {s.key && <span class="k">{s.key}</span>}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
