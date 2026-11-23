import { useEffect, useState } from 'preact/hooks';
import { demoSongs } from '../model/demo';
import { IndexedDbStore, type SongStore } from '../model/store';
import type { Song } from '../model/types';
import { Library } from './Library';
import { Reader } from './Reader';

const store: SongStore = new IndexedDbStore();

function currentId(): string | null {
  const m = /^#\/song\/(.+)$/.exec(location.hash);
  return m ? decodeURIComponent(m[1]!) : null;
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
  if (open) return <Reader song={open} onBack={() => (location.hash = '#/')} />;
  return <Library songs={songs} onOpen={(id) => (location.hash = `#/song/${encodeURIComponent(id)}`)} />;
}
