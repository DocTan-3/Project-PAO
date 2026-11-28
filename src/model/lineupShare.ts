/**
 * Line ups published by the admin ("lineups.json" in the team Gist) and how a phone updates from them.
 * The admin is the only author of line ups, so Update makes a phone's list the same as the admin's.
 */
import { type Lineup, SLOT_ORDER, type SlotKey, isISODate, normalizeLineup } from './lineup';
import type { AdminInfo } from './share';

export const LINEUPS_APP = 'bpcg-paw-lineups';
export const LINEUPS_VERSION = 1;

export function exportLineups(lineups: Lineup[], now = Date.now(), admin?: AdminInfo): string {
  return JSON.stringify({ app: LINEUPS_APP, version: LINEUPS_VERSION, exportedAt: now, ...(admin ? { admin } : {}), lineups }, null, 1);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** A line up from a file, checked field by field. Anything that does not fit is rejected. */
export function cleanLineup(v: unknown): Lineup | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id || typeof v.date !== 'string' || !isISODate(v.date) || !isObj(v.slots)) return null;
  const slots = {} as Record<SlotKey, string | null>;
  for (const k of SLOT_ORDER) {
    const x = (v.slots as Record<string, unknown>)[k];
    if (x !== undefined && x !== null && typeof x !== 'string') return null;
    slots[k] = typeof x === 'string' && x ? x : null;
  }
  const createdAt = num(v.createdAt, 0);
  return normalizeLineup({ id: v.id, date: v.date, slots, createdAt, updatedAt: num(v.updatedAt, createdAt) });
}

export type ParsedLineups = { ok: true; lineups: Lineup[]; invalid: number } | { ok: false; error: string };

export function parseLineupsFile(text: string): ParsedLineups {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The line ups are not ready yet. Ask the admin to update them.' };
  }
  if (!isObj(data) || data.app !== LINEUPS_APP || !Array.isArray(data.lineups)) {
    return { ok: false, error: 'The line ups are not ready yet. Ask the admin to update them.' };
  }
  if (num(data.version, 0) > LINEUPS_VERSION) return { ok: false, error: 'Please update the app to get the new line ups.' };
  const lineups: Lineup[] = [];
  let invalid = 0;
  for (const l of data.lineups) {
    const ok = cleanLineup(l);
    if (ok) lineups.push(ok);
    else invalid++;
  }
  return { ok: true, lineups, invalid };
}

export interface LineupUpdatePlan {
  puts: Lineup[];
  removes: string[];
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

/** Make the phone's line ups the same as the published ones. */
export function planLineupUpdate(local: Lineup[], pack: Lineup[]): LineupUpdatePlan {
  const byId = new Map(local.map((l) => [l.id, l]));
  const packIds = new Set(pack.map((l) => l.id));
  const plan: LineupUpdatePlan = { puts: [], removes: [], added: 0, updated: 0, removed: 0, unchanged: 0 };
  for (const p of pack) {
    const mine = byId.get(p.id);
    if (!mine) {
      plan.puts.push(p);
      plan.added++;
    } else if (mine.updatedAt === p.updatedAt) plan.unchanged++;
    else {
      plan.puts.push(p);
      plan.updated++;
    }
  }
  for (const l of local) {
    if (!packIds.has(l.id)) {
      plan.removes.push(l.id);
      plan.removed++;
    }
  }
  return plan;
}
