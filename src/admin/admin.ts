/**
 * Admin mode. A phone becomes the admin by entering the admin password in Settings. Only one phone is the admin at a time:
 * the phone that entered the password last. Its id is written into the published file, and an older admin phone notices
 * (when it next checks) that it is no longer the admin and goes back to normal.
 */
import { useEffect, useState } from 'preact/hooks';
import { adminVerdict, packSignature } from '../model/pack';
import type { Lineup } from '../model/lineup';
import { exportLineups } from '../model/lineupShare';
import { exportSongs, parseSongsFile, readAdmin } from '../model/share';
import type { Song } from '../model/types';
import { ADMIN_PASSWORD, adminAvailable } from './config';
import { LINEUPS_FILE } from './config';
import { fetchPackText, writeFileText, writePackText } from './github';

const KEY_ADMIN = 'pao:admin';
const KEY_DEVICE = 'pao:deviceid';
const KEY_SINCE = 'pao:adminsince';
const KEY_PUBLISHED = 'pao:published';
const KEY_UPDATED = 'pao:lastupdate';
const KEY_PUBLISHED_LINEUPS = 'pao:published-lineups';
const KEY_UPDATED_LINEUPS = 'pao:lastupdate-lineups';
const KEY_SEEN = 'pao:seen:';
const EVENT = 'pao:admin-changed';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** A random id for this phone, made once. */
export function deviceId(): string {
  let id = read(KEY_DEVICE);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    write(KEY_DEVICE, id);
  }
  return id;
}

export const isAdmin = (): boolean => adminAvailable && read(KEY_ADMIN) === '1';

function setAdmin(on: boolean): void {
  write(KEY_ADMIN, on ? '1' : null);
  dispatchEvent(new Event(EVENT));
}

export function useAdmin(): boolean {
  const [on, setOn] = useState(isAdmin);
  useEffect(() => {
    const h = () => setOn(isAdmin());
    addEventListener(EVENT, h);
    return () => removeEventListener(EVENT, h);
  }, []);
  return on;
}

export type ActivateResult = { ok: true; tookOver: boolean } | { ok: false; reason: 'password' | 'unavailable' };

/** Enter the password: this phone becomes the admin and any earlier admin phone is replaced. */
export async function activateAdmin(password: string): Promise<ActivateResult> {
  if (!adminAvailable) return { ok: false, reason: 'unavailable' };
  if (password.trim() !== ADMIN_PASSWORD) return { ok: false, reason: 'password' };
  const text = await fetchPackText().catch((e) => {
    // a Gist that has no songs file yet is fine: this phone starts it
    if ((e as { kind?: string }).kind === 'missing') return '';
    throw e;
  });
  const parsed = text ? parseSongsFile(text) : null;
  const current: Song[] = parsed && parsed.ok ? parsed.songs : [];
  const before = text ? readAdmin(text) : null;
  const since = Date.now();
  await writePackText(exportSongs(current, since, { deviceId: deviceId(), since }));
  write(KEY_SINCE, String(since));
  setAdmin(true);
  return { ok: true, tookOver: !!before && before.deviceId !== deviceId() };
}

export function turnOffAdmin(): void {
  setAdmin(false);
}

const mySince = (): number => Number(read(KEY_SINCE)) || 0;

/** Ask the published file whether this phone is still the admin; if another phone signed in later, go back to normal. */
export async function stillAdmin(): Promise<boolean> {
  if (!isAdmin()) return false;
  const a = readAdmin(await fetchPackText());
  if (adminVerdict(a, deviceId(), mySince()) === 'mine') return true;
  setAdmin(false);
  return false;
}

export type PublishResult = { ok: true; count: number } | { ok: false; reason: 'not-admin' | 'empty' };

/** Publish this phone's songs as the team's songs. */
export async function publishSongs(songs: Song[]): Promise<PublishResult> {
  if (songs.length === 0) return { ok: false, reason: 'empty' };
  const a = readAdmin(await fetchPackText());
  if (adminVerdict(a, deviceId(), mySince()) === 'lost') {
    setAdmin(false);
    return { ok: false, reason: 'not-admin' };
  }
  // write this phone as the admin again, so even an out-of-date copy of the file is corrected
  await writePackText(exportSongs(songs, Date.now(), { deviceId: deviceId(), since: mySince() || a?.since || Date.now() }));
  write(KEY_PUBLISHED, JSON.stringify({ at: Date.now(), sig: packSignature(songs) }));
  return { ok: true, count: songs.length };
}

export interface PublishedInfo {
  at: number;
  sig: string;
}
export function lastPublished(): PublishedInfo | null {
  try {
    const v = JSON.parse(read(KEY_PUBLISHED) ?? 'null') as PublishedInfo | null;
    return v && typeof v.at === 'number' && typeof v.sig === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** True when this phone's songs differ from what it last published. */
export const hasUnpublishedChanges = (songs: Song[]): boolean => lastPublished()?.sig !== packSignature(songs);

export const lastUpdateAt = (): number | null => {
  const n = Number(read(KEY_UPDATED));
  return n > 0 ? n : null;
};
export const markUpdated = (): void => write(KEY_UPDATED, String(Date.now()));

/** "today at 3:15 PM" style date for the messages. */
export function whenText(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}


// ---- line ups: published and updated on their own, separately from songs ----

/** Publish this phone's line ups as the team's line ups (songs are not touched). */
export async function publishLineups(lineups: Lineup[]): Promise<PublishResult> {
  const a = readAdmin(await fetchPackText().catch((e) => {
    if ((e as { kind?: string }).kind === 'missing') return '';
    throw e;
  }));
  if (adminVerdict(a, deviceId(), mySince()) === 'lost') {
    setAdmin(false);
    return { ok: false, reason: 'not-admin' };
  }
  await writeFileText(LINEUPS_FILE, exportLineups(lineups, Date.now(), { deviceId: deviceId(), since: mySince() || a?.since || Date.now() }));
  write(KEY_PUBLISHED_LINEUPS, JSON.stringify({ at: Date.now(), sig: packSignature(lineups) }));
  return { ok: true, count: lineups.length };
}

export function lastPublishedLineups(): PublishedInfo | null {
  try {
    const v = JSON.parse(read(KEY_PUBLISHED_LINEUPS) ?? 'null') as PublishedInfo | null;
    return v && typeof v.at === 'number' && typeof v.sig === 'string' ? v : null;
  } catch {
    return null;
  }
}

export const hasUnpublishedLineupChanges = (lineups: Lineup[]): boolean => lastPublishedLineups()?.sig !== packSignature(lineups);

export const lastLineupsUpdateAt = (): number | null => {
  const n = Number(read(KEY_UPDATED_LINEUPS));
  return n > 0 ? n : null;
};
export const markLineupsUpdated = (): void => write(KEY_UPDATED_LINEUPS, String(Date.now()));

/** Remember which published version this phone has seen (so a newer one can be announced). */
export const seenSignature = (kind: 'songs' | 'lineups'): string | null => read(KEY_SEEN + kind);
export const setSeenSignature = (kind: 'songs' | 'lineups', sig: string): void => write(KEY_SEEN + kind, sig);

/** True (once) when another phone has taken over as admin, so the screen can say so. */
export function useLostAdminNotice(): boolean {
  const admin = useAdmin();
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (!admin) return;
    stillAdmin()
      .then((ok) => {
        if (!ok) setLost(true);
      })
      .catch(() => undefined);
  }, [admin]);
  return lost && !admin;
}
