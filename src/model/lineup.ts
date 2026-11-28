import { uid } from './id';
import type { Song } from './types';

/** The places a song can go in a service line up: six required, plus an optional Response. */
export type SlotKey = 'opening' | 'welcome' | 'praise1' | 'praise2' | 'worship1' | 'worship2' | 'response';

/** Who sings and plays on one song: names typed by the admin. */
export interface SlotPeople {
  leader: string;
  keys: string;
  guitar: string;
  bass: string;
  drums: string;
  backup: string;
}
export type PersonField = keyof SlotPeople;

export const PEOPLE_FIELDS: { key: PersonField; label: string }[] = [
  { key: 'leader', label: 'Song Leader' },
  { key: 'keys', label: 'Keyboard' },
  { key: 'guitar', label: 'Guitar' },
  { key: 'bass', label: 'Bass' },
  { key: 'drums', label: 'Drums' },
  { key: 'backup', label: 'Backup singers' },
];
/** The band: copied together from an earlier song. Backup singers are copied on their own. */
export const MUSICIAN_FIELDS: PersonField[] = ['keys', 'guitar', 'bass', 'drums'];
export const MAX_NAME = 80;

export interface Lineup {
  id: string;
  /** the service date, "YYYY-MM-DD" */
  date: string;
  /** song id for each slot, or null when not chosen yet */
  slots: Record<SlotKey, string | null>;
  /** song leader, musicians and backup singers for each song (only the admin types these) */
  people?: Partial<Record<SlotKey, Partial<SlotPeople>>>;
  createdAt: number;
  updatedAt: number;
}

export interface SlotDef {
  key: SlotKey;
  label: string;
}
export interface SlotGroup {
  title: string;
  /** the group does not need to be filled for the line up to be complete */
  optional?: boolean;
  slots: SlotDef[];
}

/** What the form shows: Opening, Welcome, Praise (2 songs), Worship (2 songs), Response (optional). */
export const SLOT_GROUPS: SlotGroup[] = [
  { title: 'Opening Song', slots: [{ key: 'opening', label: 'Opening Song' }] },
  { title: 'Welcome Song', slots: [{ key: 'welcome', label: 'Welcome Song' }] },
  {
    title: 'Praise',
    slots: [
      { key: 'praise1', label: 'Praise 1' },
      { key: 'praise2', label: 'Praise 2' },
    ],
  },
  {
    title: 'Worship',
    slots: [
      { key: 'worship1', label: 'Worship 1' },
      { key: 'worship2', label: 'Worship 2' },
    ],
  },
  { title: 'Response (Optional)', optional: true, slots: [{ key: 'response', label: 'Response' }] },
];

/** Service order, which is also the order songs are swiped through. */
export const SLOT_ORDER: SlotKey[] = SLOT_GROUPS.flatMap((g) => g.slots.map((s) => s.key));

/** How many songs make a line up complete (Response is optional and not counted). */
export const REQUIRED_SLOTS: SlotKey[] = SLOT_GROUPS.filter((g) => !g.optional).flatMap((g) => g.slots.map((s) => s.key));

export const slotLabel = (key: SlotKey): string => SLOT_GROUPS.flatMap((g) => g.slots).find((s) => s.key === key)!.label;

const emptySlots = (): Record<SlotKey, string | null> => ({
  opening: null, welcome: null, praise1: null, praise2: null, worship1: null, worship2: null, response: null,
});

/** Line ups saved before a slot existed get that slot empty (so old line ups keep working). */
export const normalizeLineup = (l: Lineup): Lineup => ({ ...l, slots: { ...emptySlots(), ...l.slots } });

export function newLineup(date: string): Lineup {
  const now = Date.now();
  return { id: uid(), date, slots: emptySlots(), createdAt: now, updatedAt: now };
}

const touch = (l: Lineup): Lineup => ({ ...l, updatedAt: Date.now() });

export const setLineupDate = (l: Lineup, date: string): Lineup => touch({ ...l, date });

export const assignSlot = (l: Lineup, key: SlotKey, songId: string | null): Lineup =>
  touch({ ...l, slots: { ...l.slots, [key]: songId } });

/** Clear every slot that points at a song (used when that song is deleted). */
export function removeSongFromLineup(l: Lineup, songId: string): Lineup {
  if (!SLOT_ORDER.some((k) => l.slots[k] === songId)) return l;
  const slots = { ...l.slots };
  for (const k of SLOT_ORDER) if (slots[k] === songId) slots[k] = null;
  return touch({ ...l, slots });
}

export interface LineupEntry {
  key: SlotKey;
  label: string;
  song: Song;
}

/** The songs of a line up, in service order. Empty slots and songs that no longer exist are skipped. */
export function lineupEntries(l: Lineup, songs: Song[]): LineupEntry[] {
  const byId = new Map(songs.map((s) => [s.id, s]));
  const out: LineupEntry[] = [];
  for (const key of SLOT_ORDER) {
    const id = l.slots[key];
    const song = id ? byId.get(id) : undefined;
    if (song) out.push({ key, label: slotLabel(key), song });
  }
  return out;
}

// ---- song leader, musicians, backup singers ----

const blankPeople = (): SlotPeople => ({ leader: '', keys: '', guitar: '', bass: '', drums: '', backup: '' });

/**
 * Praise 1 and 2 share one team, and so do Worship 1 and 2, so names are kept under the first song of each pair
 * (Opening, Welcome, Praise, Worship and Response each have their own team).
 */
export const PEOPLE_KEYS: SlotKey[] = ['opening', 'welcome', 'praise1', 'worship1', 'response'];
export const peopleKey = (key: SlotKey): SlotKey => (key === 'praise2' ? 'praise1' : key === 'worship2' ? 'worship1' : key);

/** The name of the team's song group, for messages like "Copy musicians from Welcome Song". */
export const teamLabel = (key: SlotKey): string => {
  const k = peopleKey(key);
  return k === 'praise1' ? 'Praise' : k === 'worship1' ? 'Worship' : slotLabel(k);
};

/** Does this team have a song chosen (either of the pair)? */
const teamHasSong = (l: Lineup, key: SlotKey): boolean => SLOT_ORDER.some((k) => peopleKey(k) === key && !!l.slots[k]);

export const peopleOf = (l: Lineup, key: SlotKey): SlotPeople => ({ ...blankPeople(), ...(l.people?.[peopleKey(key)] ?? {}) });

export function setPerson(l: Lineup, key: SlotKey, field: PersonField, value: string): Lineup {
  const k = peopleKey(key);
  const people = { ...(l.people ?? {}), [k]: { ...peopleOf(l, k), [field]: value.slice(0, MAX_NAME) } };
  return touch({ ...l, people });
}

export const hasPeople = (l: Lineup, key: SlotKey): boolean => Object.values(peopleOf(l, key)).some((v) => v.trim() !== '');

export type CopyKind = 'musicians' | 'backup';
const fieldsOf = (kind: CopyKind): PersonField[] => (kind === 'musicians' ? MUSICIAN_FIELDS : ['backup']);

/**
 * The team to copy from: the nearest earlier team that has a song chosen and some names to copy.
 * Null for the first team, or when no earlier team has names yet (then there is nothing to offer).
 */
export function copySource(l: Lineup, key: SlotKey, kind: CopyKind): SlotKey | null {
  const at = PEOPLE_KEYS.indexOf(peopleKey(key));
  for (let i = at - 1; i >= 0; i--) {
    const k = PEOPLE_KEYS[i]!;
    if (!teamHasSong(l, k)) continue;
    const p = peopleOf(l, k);
    if (fieldsOf(kind).some((f) => p[f].trim() !== '')) return k;
  }
  return null;
}

/** Copy the musicians (or the backup singers) of the source team into this team. Names stay editable. */
export function copyPeople(l: Lineup, key: SlotKey, kind: CopyKind): Lineup {
  const from = copySource(l, key, kind);
  if (!from) return l;
  const k = peopleKey(key);
  const src = peopleOf(l, from);
  const mine = peopleOf(l, k);
  for (const f of fieldsOf(kind)) mine[f] = src[f];
  return touch({ ...l, people: { ...(l.people ?? {}), [k]: mine } });
}

/** True while this team's musicians (or backup singers) are exactly the source team's. */
export function isCopied(l: Lineup, key: SlotKey, kind: CopyKind): boolean {
  const from = copySource(l, key, kind);
  if (!from) return false;
  const a = peopleOf(l, key);
  const b = peopleOf(l, from);
  return fieldsOf(kind).every((f) => a[f] === b[f]);
}

// ---- dates (local calendar dates as "YYYY-MM-DD") ----

const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = (now = new Date()): string => toISODate(now);

/** The next Sunday on or after `from` (today, if today is Sunday). */
export function nextSunday(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return toISODate(d);
}

export const isISODate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));

/** "Sun, Nov 29, 2026". Falls back to the raw text for an invalid date. */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }): string {
  if (!isISODate(iso)) return iso || 'No date';
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * Upcoming line ups (today onward, soonest first) and finished ones (their date has passed, most recent first).
 * A line up moves from Upcoming to Finished by itself once its date is before today.
 */
export function groupLineups(lineups: Lineup[], today: string): { upcoming: Lineup[]; finished: Lineup[] } {
  const byDate = (a: Lineup, b: Lineup) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt);
  const upcoming = lineups.filter((l) => l.date >= today).sort(byDate);
  const finished = lineups.filter((l) => l.date < today).sort((a, b) => byDate(b, a));
  return { upcoming, finished };
}

export const filledCount = (l: Lineup, songs: Song[]): number => lineupEntries(l, songs).length;

/** "4 of 6 songs", "6 of 6 songs", and "6 of 6 songs + Response" when the optional slot is used. */
export function progressLabel(entries: LineupEntry[]): string {
  const required = entries.filter((e) => REQUIRED_SLOTS.includes(e.key)).length;
  const response = entries.some((e) => e.key === 'response');
  return `${required} of ${REQUIRED_SLOTS.length} songs${response ? ' + Response' : ''}`;
}

export const isComplete = (entries: LineupEntry[]): boolean =>
  REQUIRED_SLOTS.every((k) => entries.some((e) => e.key === k));

// ---- search ----

const plain = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Does this line up match what was typed? Every word typed must appear in the title or artist of one of its songs,
 * or in its date (for example "nov 29", "sunday" or "2026-11-29"). Capital letters and accents do not matter.
 */
export function lineupMatches(l: Lineup, songs: Song[], query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = plain(
    [
      ...lineupEntries(l, songs).flatMap((e) => [e.song.title, e.song.artist]),
      formatDate(l.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      formatDate(l.date, { month: 'short', day: 'numeric' }),
      l.date,
    ].join(' | '),
  );
  return words.every((w) => hay.includes(w));
}

/** Song ids that line ups point at but that are not in the library. */
export function missingSongIds(lineups: Lineup[], songs: Song[]): string[] {
  const have = new Set(songs.map((s) => s.id));
  const out = new Set<string>();
  for (const l of lineups) for (const k of SLOT_ORDER) {
    const id = l.slots[k];
    if (id && !have.has(id)) out.add(id);
  }
  return [...out];
}
