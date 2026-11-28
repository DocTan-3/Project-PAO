/**
 * "New songs are ready" and "New line ups are ready" notices. When the app opens (and when it comes back to the
 * screen) a phone that is not the admin quietly checks what the admin has published and compares it with what it
 * has already updated from. The Songs and Line up screens show the notice and an emphasised Update button.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Lineup } from '../model/lineup';
import { packSignature, planUpdate } from '../model/pack';
import type { Song } from '../model/types';
import { parseLineupsFile, planLineupUpdate } from '../model/lineupShare';
import { parseSongsFile } from '../model/share';
import { isAdmin, seenSignature } from './admin';
import { updatesAvailable } from './config';
import { fetchBoth } from './github';

export type NoticeKind = 'songs' | 'lineups';
type State = Record<NoticeKind, boolean> & { songsCount: number; lineupsCount: number };

let state: State = { songs: false, lineups: false, songsCount: 0, lineupsCount: 0 };

/** How the app reads this phone's own songs and line ups, so a notice can say how many are new. */
let local: (() => Promise<{ songs: Song[]; lineups: Lineup[] }>) | null = null;
export const setLocalSource = (fn: () => Promise<{ songs: Song[]; lineups: Lineup[] }>): void => {
  local = fn;
};
const EVENT = 'pao:notice-changed';
const set = (next: State) => {
  if (next.songs === state.songs && next.lineups === state.lineups && next.songsCount === state.songsCount && next.lineupsCount === state.lineupsCount) return;
  state = next;
  dispatchEvent(new Event(EVENT));
};

export function useUpdateNotice(): State {
  const [s, setS] = useState(state);
  useEffect(() => {
    const h = () => setS(state);
    addEventListener(EVENT, h);
    h();
    return () => removeEventListener(EVENT, h);
  }, []);
  return s;
}

export const clearNotice = (kind: NoticeKind): void => set({ ...state, [kind]: false, [`${kind}Count`]: 0 });

let last = 0;
/** Look at what is published and set the notices. Quiet: any problem (no internet, nothing published) is ignored. */
export async function checkForUpdates(force = false): Promise<void> {
  if (!updatesAvailable || isAdmin()) return;
  if (!force && Date.now() - last < 3 * 60 * 1000) return;
  last = Date.now();
  try {
    const { songs, lineups } = await fetchBoth();
    const s = songs ? parseSongsFile(songs) : null;
    const l = lineups ? parseLineupsFile(lineups) : null;
    const newSongs = !!s && s.ok && s.songs.length > 0 && packSignature(s.songs) !== seenSignature('songs');
    const newLineups = !!l && l.ok && l.lineups.length > 0 && packSignature(l.lineups) !== seenSignature('lineups');
    let songsCount = 0;
    let lineupsCount = 0;
    try {
      const mine = local ? await local() : null;
      if (mine && newSongs && s && s.ok) {
        const plan = planUpdate(mine.songs, s.songs);
        songsCount = plan.added + plan.updated;
      }
      if (mine && newLineups && l && l.ok) {
        const plan = planLineupUpdate(mine.lineups, l.lineups);
        lineupsCount = plan.added + plan.updated;
      }
    } catch {
      /* no count: the notice then says the admin has updated them */
    }
    set({ songs: newSongs, lineups: newLineups, songsCount, lineupsCount });
  } catch {
    /* offline or not published: say nothing */
  }
}

let started = false;
/** Check now, and again whenever the app comes back to the screen. */
export function startNoticeChecks(): void {
  if (started) return;
  started = true;
  void checkForUpdates(true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdates();
  });
}
