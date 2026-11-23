import type { Song } from '../model/types';

export function Library({
  songs,
  onOpen,
  onNew,
}: {
  songs: Song[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <main class="library">
      <div class="lib-head">
        <h1>Songs</h1>
        <button class="btn primary" onClick={onNew}>New song</button>
      </div>
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
