/**
 * Sharing songs between phones as a small file (no server, no account). The file is plain JSON:
 *   { app: "bpcg-paw-songs", version: 1, exportedAt, songs: [...] }
 * Receiving merges the songs into the library: a song the receiver does not have is added, and when they
 * already have it the newer version wins.
 */
import { isCategory } from './library';
import { webUrl } from './url';
import type { Language, Line, PlacedChord, Section, Song } from './types';

export const SHARE_APP = 'bpcg-paw-songs';
export const SHARE_VERSION = 1;
const MAX_SONGS = 5000;

/** Who published the team's songs last. Only one phone is the admin at a time. */
export interface AdminInfo {
  deviceId: string;
  since: number;
}

/** `source` marks where a copy came from on one phone; it is never written to a file. */
const forFile = (s: Song): Song => {
  const { source: _source, ...rest } = s;
  return rest;
};

export function exportSongs(songs: Song[], now = Date.now(), admin?: AdminInfo): string {
  return JSON.stringify({ app: SHARE_APP, version: SHARE_VERSION, exportedAt: now, ...(admin ? { admin } : {}), songs: songs.map(forFile) }, null, 1);
}

/** The admin recorded in a songs file, if any. */
export function readAdmin(text: string): AdminInfo | null {
  try {
    const a = (JSON.parse(text) as { admin?: unknown }).admin;
    if (isObj(a) && typeof a.deviceId === 'string' && a.deviceId) return { deviceId: a.deviceId, since: num(a.since, 0) };
  } catch {
    /* not JSON */
  }
  return null;
}

/** "BPCG-PAW-songs-2026-11-24.json" */
export function exportFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `BPCG-PAW-songs-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function cleanChord(v: unknown): PlacedChord | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) return null;
  if (typeof v.text !== 'string') return null;
  const at = num(v.at, -1);
  if (!Number.isInteger(at) || at < 0) return null;
  return { id: v.id, at, text: v.text };
}

function cleanLine(v: unknown): Line | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id || typeof v.lyrics !== 'string' || !Array.isArray(v.chords)) return null;
  const chords: PlacedChord[] = [];
  for (const c of v.chords) {
    const ok = cleanChord(c);
    if (!ok) return null;
    chords.push(ok);
  }
  return { id: v.id, lyrics: v.lyrics, chords };
}

function cleanSection(v: unknown): Section | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id || !Array.isArray(v.lines)) return null;
  const lines: Line[] = [];
  for (const l of v.lines) {
    const ok = cleanLine(l);
    if (!ok) return null;
    lines.push(ok);
  }
  return { id: v.id, label: str(v.label), lines };
}

/** A song from a file, checked field by field. Anything that does not fit is rejected, never half-imported. */
export function cleanSong(v: unknown): Song | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id || typeof v.title !== 'string' || !Array.isArray(v.sections)) return null;
  const sections: Section[] = [];
  for (const s of v.sections) {
    const ok = cleanSection(s);
    if (!ok) return null;
    sections.push(ok);
  }
  const language: Language | undefined = v.language === 'tl' ? 'tl' : v.language === 'en' ? 'en' : undefined;
  const createdAt = num(v.createdAt, 0);
  const song: Song = {
    id: v.id,
    title: v.title,
    artist: str(v.artist),
    key: typeof v.key === 'string' && v.key ? v.key : null,
    sections,
    createdAt,
    updatedAt: num(v.updatedAt, createdAt),
  };
  if (language) song.language = language;
  if (isCategory(v.category)) song.category = v.category;
  if (typeof v.notes === 'string' && v.notes) song.notes = v.notes;
  const video = typeof v.videoUrl === 'string' ? webUrl(v.videoUrl) : null;
  if (video) song.videoUrl = video;
  return song;
}

export type ParsedFile = { ok: true; songs: Song[]; invalid: number } | { ok: false; error: string };

export function parseSongsFile(text: string): ParsedFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a songs file from this app." };
  }
  if (!isObj(data) || data.app !== SHARE_APP || !Array.isArray(data.songs)) {
    return { ok: false, error: "That file isn't a songs file from this app." };
  }
  if (num(data.version, 0) > SHARE_VERSION) {
    return { ok: false, error: 'That file was made by a newer version of the app. Update the app and try again.' };
  }
  if (data.songs.length > MAX_SONGS) return { ok: false, error: 'That file has too many songs.' };
  const songs: Song[] = [];
  let invalid = 0;
  for (const s of data.songs) {
    const ok = cleanSong(s);
    if (ok) songs.push(ok);
    else invalid++;
  }
  return { ok: true, songs, invalid };
}

export interface MergePlan {
  /** songs to save (new ones, and the winning version of ones that changed) */
  puts: Song[];
  added: number;
  updated: number;
  /** already had the same or a newer version */
  unchanged: number;
}

const sameSong = (s: Song) => `${s.title.trim().toLowerCase()}|${s.artist.trim().toLowerCase()}`;

/**
 * Merge received songs into the existing library. The newer `updatedAt` wins.
 * A song matches by id, or (when it came from a different phone's copy) by the same title and artist; in
 * that case the local id is kept so line ups that use the song keep working.
 */
export function planMerge(existing: Song[], incoming: Song[]): MergePlan {
  const work = new Map(existing.map((s) => [s.id, s]));
  const puts = new Map<string, Song>();
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  const findByName = (s: Song): Song | undefined => {
    if (!s.title.trim()) return undefined;
    const key = sameSong(s);
    for (const e of work.values()) if (sameSong(e) === key) return e;
    return undefined;
  };
  for (const song of incoming) {
    const local = work.get(song.id) ?? findByName(song);
    if (!local) {
      work.set(song.id, song);
      puts.set(song.id, song);
      added++;
    } else if (song.updatedAt > local.updatedAt) {
      const winner: Song = { ...song, id: local.id, createdAt: local.createdAt || song.createdAt };
      work.set(local.id, winner);
      puts.set(local.id, winner);
      // a song first added from this same file and then replaced by a newer copy still counts as added
      if (local === existing.find((e) => e.id === local.id)) updated++;
    } else {
      unchanged++;
    }
  }
  return { puts: [...puts.values()], added, updated, unchanged };
}
