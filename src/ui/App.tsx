import { useCallback, useEffect, useState } from 'preact/hooks';
import { demoSongs } from '../model/demo';
import { newSong } from '../model/edit';
import { IndexedDbStore, type SongStore } from '../model/store';
import type { Song } from '../model/types';
import { Editor, type ExitTarget } from './Editor';
import { Library } from './Library';
import { Reader } from './Reader';

const store: SongStore = new IndexedDbStore();

type Route = { kind: 'library' } | { kind: 'song' | 'edit'; id: string };

// Hash routes are plain "#song-<id>" / "#edit-<id>" (letters, digits, hyphens) so they also work when hosted in a frame.
function parseRoute(): Route {
  const m = /^#(song|edit)-([A-Za-z0-9-]+)$/.exec(location.hash);
  return m ? { kind: m[1] as 'song' | 'edit', id: m[2]! } : { kind: 'library' };
}

/** Read (or set, when `set` is given) a localStorage flag; storage may be blocked, so never throw. */
function flag(key: string, set?: string): string | null {
  try {
    if (set !== undefined) localStorage.setItem(key, set);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function App() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [route, setRoute] = useState<Route>(parseRoute);

  const refresh = useCallback(async () => setSongs(await store.list()), []);

  useEffect(() => {
    (async () => {
      let all = await store.list();
      if (all.length === 0 && !flag('pao:seeded')) {
        for (const s of demoSongs()) await store.put(s);
        flag('pao:seeded', '1');
        all = await store.list();
      }
      setSongs(all);
    })();
    const onHash = () => {
      setRoute(parseRoute());
      void refresh();
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [refresh]);

  if (!songs) return <p class="muted center">Loading…</p>;

  const go = (hash: string) => {
    location.hash = hash;
  };
  const song = route.kind !== 'library' ? songs.find((s) => s.id === route.id) : undefined;

  if (route.kind === 'edit' && song)
    return (
      <Editor
        key={song.id}
        initial={song}
        store={store}
        onExit={(to: ExitTarget, id) => go(to === 'preview' && id ? `#song-${id}` : '')}
      />
    );
  if (route.kind === 'song' && song)
    return <Reader song={song} onBack={() => go('')} onEdit={() => go(`#edit-${song.id}`)} />;

  return (
    <Library
      songs={songs}
      onOpen={(id) => go(`#song-${id}`)}
      onNew={async () => {
        const s = newSong();
        await store.put(s);
        go(`#edit-${s.id}`);
      }}
    />
  );
}
