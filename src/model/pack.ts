/**
 * The team's published songs ("the pack") and how a phone updates from it.
 * The admin phone publishes; every other phone taps Update and gets a fresh copy of the admin's songs.
 * Songs a person made or edited on their own phone are never replaced or removed.
 */
import type { Song } from './types';

export interface UpdatePlan {
  /** songs to save (new ones and refreshed ones, marked as coming from the admin) */
  puts: Song[];
  /** songs that came from the admin earlier and are no longer published */
  removes: string[];
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  /** published songs the person has changed on their own phone, so their copy was kept */
  keptMine: number;
}

export function planUpdate(local: Song[], pack: Song[]): UpdatePlan {
  const byId = new Map(local.map((s) => [s.id, s]));
  const packIds = new Set(pack.map((s) => s.id));
  const plan: UpdatePlan = { puts: [], removes: [], added: 0, updated: 0, removed: 0, unchanged: 0, keptMine: 0 };
  for (const p of pack) {
    const mine = byId.get(p.id);
    const fromAdmin: Song = { ...p, source: 'admin' };
    if (!mine) {
      plan.puts.push(fromAdmin);
      plan.added++;
    } else if (mine.source === 'admin') {
      if (mine.updatedAt === p.updatedAt) plan.unchanged++;
      else {
        plan.puts.push(fromAdmin);
        plan.updated++;
      }
    } else if (mine.updatedAt > p.updatedAt) {
      plan.keptMine++; // edited here after the admin published it
    } else if (mine.updatedAt === p.updatedAt) {
      plan.puts.push(fromAdmin); // the same song (for example received by file): adopt it as the team's copy
      plan.unchanged++;
    } else {
      plan.puts.push(fromAdmin);
      plan.updated++;
    }
  }
  for (const s of local) {
    if (s.source === 'admin' && !packIds.has(s.id)) {
      plan.removes.push(s.id);
      plan.removed++;
    }
  }
  return plan;
}

/** A short fingerprint of a library (which songs, and when each was last changed), to tell if it differs from what was published. */
export function packSignature(songs: Song[]): string {
  const parts = songs.map((s) => `${s.id}:${s.updatedAt}`).sort().join('|');
  let h = 5381;
  for (let i = 0; i < parts.length; i++) h = ((h * 33) ^ parts.charCodeAt(i)) >>> 0;
  return `${songs.length}-${h.toString(36)}`;
}
