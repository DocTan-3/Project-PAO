import { useState } from 'preact/hooks';
import type { Song } from '../model/types';

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
  return (
    <main class="library">
      <div class="lib-head">
        <h1>Songs</h1>
        <button class="btn primary" onClick={onNew}>New song</button>
      </div>
      {songs.length === 0 && <p class="muted">No songs yet. Tap New song to write one.</p>}
      <ul>
        {songs.map((s) => (
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
                  <span class="t">{s.title || 'Untitled'}</span>
                  <span class="a">{s.artist}</span>
                  {s.key && <span class="k">{s.key}</span>}
                </button>
                <button
                  class="btn trash"
                  onClick={() => setConfirmId(s.id)}
                  aria-label={`Delete ${s.title || 'Untitled'}`}
                  title="Delete song"
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
