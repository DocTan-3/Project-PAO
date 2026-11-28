import { useCallback, useEffect, useState } from 'preact/hooks';
import { demoSongs, tagalogDemoSongs } from '../model/demo';
import { newSong } from '../model/edit';
import { groupSongs, languageOf } from '../model/library';
import {
  type Lineup,
  lineupEntries,
  newLineup,
  nextSunday,
  removeSongFromLineup,
} from '../model/lineup';
import { planUpdate } from '../model/pack';
import { planLineupUpdate } from '../model/lineupShare';
import { IndexedDbStore, type Store } from '../model/store';
import type { Language, Song } from '../model/types';
import { Drawer, type Section } from './Drawer';
import { Editor, type ExitTarget } from './Editor';
import { ChordsPage } from './ChordsPage';
import { favoriteIds } from '../model/favorites';
import { FavoritesPage } from './FavoritesPage';
import { Library } from './Library';
import { LineupList } from './LineupList';
import { LineupPage } from './LineupPage';
import { useAdmin } from '../admin/admin';
import { updatesAvailable } from '../admin/config';
import { setLocalSource, startNoticeChecks } from '../admin/notice';
import { useKeepAwakeSetting } from './keepAwake';
import { Reader, type ReaderNav } from './Reader';
import { SettingsPage } from './SettingsPage';

const store: Store = new IndexedDbStore();

type Route =
  | { kind: 'songs' }
  | { kind: 'lineups' }
  | { kind: 'chords' }
  | { kind: 'settings' }
  | { kind: 'favorites' }
  | { kind: 'lineup'; id: string }
  | { kind: 'set'; id: string; index: number }
  | { kind: 'song' | 'edit'; id: string };

// Hash routes use only letters, digits and hyphens, so they also work when hosted in a frame:
//   #  (songs)  #lineups  #lineup-<id>  #set-<lineupId>-<position>  #song-<id>  #edit-<id>
function parseRoute(): Route {
  const h = location.hash;
  if (h === '#lineups') return { kind: 'lineups' };
  if (h === '#chords') return { kind: 'chords' };
  if (h === '#settings') return { kind: 'settings' };
  if (h === '#favorites') return { kind: 'favorites' };
  let m = /^#lineup-([A-Za-z0-9-]+)$/.exec(h);
  if (m) return { kind: 'lineup', id: m[1]! };
  m = /^#set-([A-Za-z0-9-]+)-(\d+)$/.exec(h);
  if (m) return { kind: 'set', id: m[1]!, index: Number(m[2]) };
  m = /^#(song|edit)-([A-Za-z0-9-]+)$/.exec(h);
  if (m) return { kind: m[1] as 'song' | 'edit', id: m[2]! };
  return { kind: 'songs' };
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

/** True when the open song was reached from the Favorites screen, so Back returns there. */
const openedFromFavorites = (): boolean => {
  try {
    return sessionStorage.getItem('pao:from') === 'favorites';
  } catch {
    return false;
  }
};

const go = (hash: string) => {
  location.hash = hash;
};
/** Move without adding a history entry (swiping through songs should not fill the back button). */
const swap = (hash: string) => location.replace(hash.startsWith('#') ? hash : `#${hash}`);

export function App() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [route, setRoute] = useState<Route>(parseRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const [keepAwake, setKeepAwake] = useKeepAwakeSetting();
  const admin = useAdmin();
  /** Only the admin phone can create or change line ups when team updates are set up; everyone else views them. */
  const canEditLineups = !updatesAvailable || admin;

  const refresh = useCallback(async () => {
    setSongs(await store.list());
    setLineups(await store.listLineups());
  }, []);

  useEffect(() => {
    setLocalSource(async () => ({ songs: await store.list(), lineups: await store.listLineups() }));
    startNoticeChecks();
    (async () => {
      let all = await store.list();
      // first start: add the sample songs. If the app was closed part-way through, the next start finishes the job
      // (the sample songs have fixed ids, so saving them again is harmless).
      if (!flag('pao:seeded') && all.every((s) => s.id.startsWith('demo-'))) {
        for (const s of demoSongs()) await store.put(s);
        flag('pao:seeded', '1');
        flag('pao:seeded-tl', '1');
        all = await store.list();
      }
      // libraries created before Tagalog existed get the Tagalog sample songs once
      if (!flag('pao:seeded-tl')) {
        for (const s of tagalogDemoSongs()) await store.put(s);
        flag('pao:seeded-tl', '1');
        all = await store.list();
      }
      setSongs(all);
      setLineups(await store.listLineups());
    })();
    const onHash = () => {
      setRoute(parseRoute());
      setMenuOpen(false);
      void refresh();
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [refresh]);

  if (!songs) return <p class="muted center">Loading…</p>;

  const saveLineup = async (l: Lineup) => {
    setLineups((list) => list.map((x) => (x.id === l.id ? l : x)));
    await store.putLineup(l);
  };

  const deleteSong = async (id: string) => {
    await store.delete(id);
    // a song that is gone must not stay in any line up
    for (const l of lineups) {
      const cleaned = removeSongFromLineup(l, id);
      if (cleaned !== l) await store.putLineup(cleaned);
    }
    await refresh();
  };

  /** The team's published songs arrived: refresh the team's songs; the person's own songs are never touched. */
  const updateFromTeam = async (pack: Song[]) => {
    const plan = planUpdate(songs, pack);
    for (const s of plan.puts) await store.put(s);
    for (const id of plan.removes) await store.delete(id);
    if (plan.removes.length > 0) {
      for (const l of await store.listLineups()) {
        const cleaned = plan.removes.reduce((acc, id) => removeSongFromLineup(acc, id), l);
        if (cleaned !== l) await store.putLineup(cleaned);
      }
    }
    await refresh();
    return plan;
  };

  /** The admin's published line ups arrived: this phone's line ups become the same as the admin's. */
  const updateLineupsFromTeam = async (pack: Lineup[]) => {
    const plan = planLineupUpdate(lineups, pack);
    for (const l of plan.puts) await store.putLineup(l);
    for (const id of plan.removes) await store.deleteLineup(id);
    await refresh();
    return plan;
  };

  const pickSection = (s: Section) => {
    setMenuOpen(false);
    go(s === 'songs' ? '' : `#${s}`);
  };
  const drawer = (active: Section) => (
    <Drawer
      open={menuOpen}
      active={active}
      counts={{ songs: songs.length, lineups: lineups.length, favorites: favoriteIds().filter((id) => songs.some((s) => s.id === id)).length }}
      keepAwake={keepAwake}
      onKeepAwake={setKeepAwake}
      onPick={pickSection}
      onClose={() => setMenuOpen(false)}
    />
  );

  // ---- editor ----
  if (route.kind === 'edit') {
    const song = songs.find((s) => s.id === route.id);
    if (song)
      return (
        <Editor
          key={song.id}
          initial={song}
          store={store}
          onExit={(to: ExitTarget, id) => go(to === 'preview' && id ? `#song-${id}` : '')}
        />
      );
  }

  // ---- reader: a single song, swiping through all songs of its language ----
  if (route.kind === 'song') {
    const song = songs.find((s) => s.id === route.id);
    if (song) {
      const order = groupSongs(songs, languageOf(song)).flatMap((g) => g.songs);
      const at = order.findIndex((s) => s.id === song.id);
      const prev = order[at - 1];
      const next = order[at + 1];
      const nav: ReaderNav = {
        prev: prev && { title: prev.title, go: () => swap(`#song-${prev.id}`) },
        next: next && { title: next.title, go: () => swap(`#song-${next.id}`) },
      };
      return (
        <Reader
          key={song.id}
          song={song}
          nav={nav}
          onBack={() => go(openedFromFavorites() ? '#favorites' : '')}
          onEdit={() => go(`#edit-${song.id}`)}
        />
      );
    }
  }

  // ---- reader: a song of a line up, swiping through the service order ----
  if (route.kind === 'set') {
    const lineup = lineups.find((l) => l.id === route.id);
    const entries = lineup ? lineupEntries(lineup, songs) : [];
    const at = Math.min(Math.max(route.index, 0), entries.length - 1);
    const entry = entries[at];
    if (lineup && entry) {
      const prev = entries[at - 1];
      const next = entries[at + 1];
      const nav: ReaderNav = {
        slot: entry.label,
        prev: prev && { title: prev.song.title, go: () => swap(`#set-${lineup.id}-${at - 1}`) },
        next: next && { title: next.song.title, go: () => swap(`#set-${lineup.id}-${at + 1}`) },
      };
      return (
        <Reader
          key={`set-${lineup.id}-${at}`}
          song={entry.song}
          nav={nav}
          onBack={() => swap(`#lineup-${lineup.id}`)}
          onEdit={() => go(`#edit-${entry.song.id}`)}
        />
      );
    }
  }

  // ---- one line up ----
  if (route.kind === 'lineup' || route.kind === 'set') {
    const lineup = lineups.find((l) => l.id === route.id);
    if (lineup)
      return (
        <LineupPage
          key={lineup.id}
          lineup={lineup}
          songs={songs}
          onChange={saveLineup}
          readOnly={!canEditLineups}
          publish={
            updatesAvailable && admin
              ? {
                  lineups,
                  onDone: (count) => {
                    try {
                      localStorage.setItem('pao:lineuptab', 'upcoming');
                      sessionStorage.setItem('pao:flash', `Updated ${count} ${count === 1 ? 'line up' : 'line ups'}. Everyone gets them when they tap Update.`);
                    } catch {
                      /* ignore */
                    }
                    go('#lineups');
                  },
                }
              : undefined
          }
          onBack={() => go('#lineups')}
          onOpenSong={(index) => go(`#set-${lineup.id}-${index}`)}
          onDelete={async () => {
            await store.deleteLineup(lineup.id);
            await refresh();
            go('#lineups');
          }}
        />
      );
  }

  // ---- chords and settings ----
  if (route.kind === 'chords' || route.kind === 'settings' || route.kind === 'favorites') {
    return (
      <>
        {route.kind === 'chords' ? (
          <ChordsPage onMenu={() => setMenuOpen(true)} />
        ) : route.kind === 'favorites' ? (
          <FavoritesPage songs={songs} onMenu={() => setMenuOpen(true)} onOpen={(id) => { try { sessionStorage.setItem('pao:from', 'favorites'); } catch { /* ignore */ } go(`#song-${id}`); }} />
        ) : (
          <SettingsPage onMenu={() => setMenuOpen(true)} />
        )}
        {drawer(route.kind)}
      </>
    );
  }

  // ---- line up list ----
  if (route.kind === 'lineups' || route.kind === 'lineup' || route.kind === 'set') {
    return (
      <>
        <LineupList
          lineups={lineups}
          songs={songs}
          onMenu={() => setMenuOpen(true)}
          onOpen={(id) => go(`#lineup-${id}`)}
          onCreate={async () => {
            const l = newLineup(nextSunday());
            await store.putLineup(l);
            await refresh();
            go(`#lineup-${l.id}`);
          }}
          onDelete={async (id) => {
            await store.deleteLineup(id);
            await refresh();
          }}
          onUpdate={updateLineupsFromTeam}
          canEdit={canEditLineups}
        />
        {drawer('lineups')}
      </>
    );
  }

  // ---- songs (home) ----
  return (
    <>
      <Library
        songs={songs}
        onMenu={() => setMenuOpen(true)}
        onOpen={(id) => go(`#song-${id}`)}
        onDelete={deleteSong}
        onUpdate={updateFromTeam}
        onNew={async (language: Language) => {
          const s = { ...newSong(), language };
          await store.put(s);
          go(`#edit-${s.id}`);
        }}
      />
      {drawer('songs')}
    </>
  );
}
