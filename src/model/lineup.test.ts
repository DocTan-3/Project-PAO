import { describe, expect, it } from 'vitest';
import { mkSong } from './build';
import {
  SLOT_GROUPS, SLOT_ORDER, assignSlot, filledCount, formatDate, groupLineups, isISODate, lineupEntries,
  newLineup, nextSunday, removeSongFromLineup, setLineupDate, todayISO,
} from './lineup';

const songs = ['Opener', 'Welcome', 'Praise A', 'Praise B', 'Worship A', 'Worship B'].map((t) => mkSong({ title: t }));

describe('slots', () => {
  it('has the sections the client asked for, in order', () => {
    expect(SLOT_GROUPS.map((g) => [g.title, g.slots.length])).toEqual([
      ['Opening Song', 1], ['Welcome Song', 1], ['Praise', 2], ['Worship', 2],
    ]);
    expect(SLOT_ORDER).toEqual(['opening', 'welcome', 'praise1', 'praise2', 'worship1', 'worship2']);
  });
  it('a new line up is empty and has the date given', () => {
    const l = newLineup('2026-11-29');
    expect(l.date).toBe('2026-11-29');
    expect(Object.values(l.slots).every((v) => v === null)).toBe(true);
    expect(filledCount(l, songs)).toBe(0);
  });
});

describe('assigning songs', () => {
  it('fills and clears a slot without touching the others', () => {
    let l = newLineup('2026-11-29');
    l = assignSlot(l, 'praise2', songs[3]!.id);
    expect(l.slots.praise2).toBe(songs[3]!.id);
    expect(l.slots.praise1).toBeNull();
    l = assignSlot(l, 'praise2', null);
    expect(l.slots.praise2).toBeNull();
  });
  it('does not change the original', () => {
    const l = newLineup('2026-11-29');
    assignSlot(l, 'opening', 'x');
    expect(l.slots.opening).toBeNull();
  });
  it('changes the date', () => {
    expect(setLineupDate(newLineup('2026-11-29'), '2026-12-06').date).toBe('2026-12-06');
  });
});

describe('lineupEntries', () => {
  it('lists songs in service order whatever order they were chosen in', () => {
    let l = newLineup('2026-11-29');
    l = assignSlot(l, 'worship2', songs[5]!.id);
    l = assignSlot(l, 'opening', songs[0]!.id);
    l = assignSlot(l, 'praise1', songs[2]!.id);
    expect(lineupEntries(l, songs).map((e) => [e.label, e.song.title])).toEqual([
      ['Opening Song', 'Opener'], ['Praise 1', 'Praise A'], ['Worship 2', 'Worship B'],
    ]);
  });
  it('skips empty slots and songs that were deleted', () => {
    let l = newLineup('2026-11-29');
    l = assignSlot(l, 'opening', songs[0]!.id);
    l = assignSlot(l, 'welcome', 'gone');
    expect(lineupEntries(l, songs)).toHaveLength(1);
    expect(filledCount(l, songs)).toBe(1);
  });
  it('the same song may appear twice', () => {
    let l = newLineup('2026-11-29');
    l = assignSlot(assignSlot(l, 'praise1', songs[2]!.id), 'worship1', songs[2]!.id);
    expect(lineupEntries(l, songs)).toHaveLength(2);
  });
  it('removeSongFromLineup clears every slot using it, and only those', () => {
    let l = newLineup('2026-11-29');
    l = assignSlot(assignSlot(assignSlot(l, 'praise1', songs[2]!.id), 'worship1', songs[2]!.id), 'opening', songs[0]!.id);
    const out = removeSongFromLineup(l, songs[2]!.id);
    expect(out.slots).toMatchObject({ praise1: null, worship1: null, opening: songs[0]!.id });
    const untouched = removeSongFromLineup(l, 'nobody');
    expect(untouched).toBe(l);
  });
});

describe('dates', () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 15, 30);
  it('next Sunday on or after a day', () => {
    expect(nextSunday(d(2026, 11, 23))).toBe('2026-11-29'); // Monday
    expect(nextSunday(d(2026, 11, 28))).toBe('2026-11-29'); // Saturday
    expect(nextSunday(d(2026, 11, 29))).toBe('2026-11-29'); // Sunday stays
    expect(nextSunday(d(2026, 12, 30))).toBe('2027-01-03'); // across the new year
    expect(nextSunday(d(2028, 2, 26))).toBe('2028-02-27'); // leap year
  });
  it('todayISO uses the local calendar date', () => {
    expect(todayISO(d(2026, 1, 5))).toBe('2026-01-05');
    expect(todayISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
  it('validates dates', () => {
    expect(isISODate('2026-11-29')).toBe(true);
    expect(isISODate('2026-13-45')).toBe(false);
    expect(isISODate('11/29/2026')).toBe(false);
    expect(isISODate('')).toBe(false);
  });
  it('formats with the weekday', () => {
    expect(formatDate('2026-11-29')).toBe('Sun, Nov 29, 2026');
    expect(formatDate('2027-01-03')).toBe('Sun, Jan 3, 2027');
    expect(formatDate('nonsense')).toBe('nonsense');
    expect(formatDate('')).toBe('No date');
  });
});

describe('groupLineups', () => {
  const mk = (date: string) => newLineup(date);
  const all = [mk('2026-11-15'), mk('2026-12-06'), mk('2026-11-29'), mk('2026-11-01'), mk('2026-11-23')];
  it('upcoming soonest first, past most recent first, today counts as upcoming', () => {
    const g = groupLineups(all, '2026-11-23');
    expect(g.upcoming.map((l) => l.date)).toEqual(['2026-11-23', '2026-11-29', '2026-12-06']);
    expect(g.past.map((l) => l.date)).toEqual(['2026-11-15', '2026-11-01']);
  });
  it('handles empty', () => {
    expect(groupLineups([], '2026-11-23')).toEqual({ upcoming: [], past: [] });
  });
});
