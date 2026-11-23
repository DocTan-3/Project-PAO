import { useEffect, useState } from 'preact/hooks';
import { demoSongs } from '../model/demo';
import { IndexedDbStore, type SongStore } from '../model/store';
import type { Song } from '../model/types';
import { Library } from './Library';
import { Reader } from './Reader';

const store: SongStore = new IndexedDbStore();

// Hash routes are plain "#song-<id>" (letters, digits, hyphens) so they also work when hosted in a frame.
function currentId(): string | null {
  const m = /^#song-([A-Za-z0-9-]+)$/.exec(location.hash);
  return m ? m[1]! : null;
}

export function App() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(currentId());

  useEffect(() => {
    (async () => {
      let all = await store.list();
      if (all.length === 0) {
        for (const s of demoSongs()) await store.put(s);
        all = await store.list();
      }
      setSongs(all);
    })();
    const onHash = () => setOpenId(currentId());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  if (!songs) return <p class="muted center">Loading…</p>;
  const open = openId ? songs.find((s) => s.id === openId) : undefined;
  if (open) return <Reader song={open} onBack={() => (location.hash = '')} />;
  return <Library songs={songs} onOpen={(id) => (location.hash = `#song-${id}`)} />;
}
