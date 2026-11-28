import { describe, expect, it } from 'vitest';
import { mkLine, mkSection, mkSong } from './build';
import { assignSlot, lineupMatches, missingSongIds, newLineup } from './lineup';
import { exportLineups, parseLineupsFile, planLineupUpdate } from './lineupShare';
import { exportSongs, parseSongsFile } from './share';
import { webHost, webUrl } from './url';

const song = (title: string, artist = 'A', id?: string) =>
  mkSong({ title, artist, ...(id ? { id } : {}), sections: [mkSection('V', mkLine('la'))] });

describe('line up file', () => {
  it('round-trips line ups with their slots', () => {
    const l = assignSlot(assignSlot(newLineup('2026-11-29'), 'opening', 'a'), 'response', 'b');
    const r = parseLineupsFile(exportLineups([l]));
    expect(r.ok && r.lineups).toEqual([l]);
  });
  it('rejects other files and bad line ups', () => {
    expect(parseLineupsFile('nope').ok).toBe(false);
    expect(parseLineupsFile('{"app":"bpcg-paw-songs","songs":[]}').ok).toBe(false);
    expect(parseLineupsFile(JSON.stringify({ app: 'bpcg-paw-lineups', version: 9, lineups: [] })).ok).toBe(false);
    const good = newLineup('2026-12-06');
    const r = parseLineupsFile(JSON.stringify({ app: 'bpcg-paw-lineups', version: 1, lineups: [good, { id: 'x', date: 'soon', slots: {} }, { id: 'y', date: '2026-12-06', slots: { opening: 5 } }, null] }));
    expect(r.ok && r.lineups.length).toBe(1);
    expect(r.ok && r.invalid).toBe(3);
  });
  it('fills slots that an older file did not have', () => {
    const r = parseLineupsFile(JSON.stringify({ app: 'bpcg-paw-lineups', version: 1, lineups: [{ id: 'a', date: '2026-11-29', slots: { opening: 's1' }, createdAt: 1, updatedAt: 2 }] }));
    expect(r.ok && r.lineups[0]!.slots.response).toBeNull();
    expect(r.ok && r.lineups[0]!.slots.opening).toBe('s1');
  });
});

describe('updating line ups from the admin', () => {
  const mk = (id: string, date: string, updatedAt: number) => ({ ...newLineup(date), id, updatedAt });
  it('adds, refreshes and removes so the phone matches the admin', () => {
    const local = [mk('a', '2026-11-29', 1), mk('b', '2026-12-06', 1), mk('mine', '2026-12-13', 9)];
    const pack = [mk('a', '2026-11-29', 1), mk('b', '2026-12-06', 5), mk('c', '2026-12-20', 1)];
    const p = planLineupUpdate(local, pack);
    expect(p).toMatchObject({ added: 1, updated: 1, removed: 1, unchanged: 1 });
    expect(p.puts.map((l) => l.id).sort()).toEqual(['b', 'c']);
    expect(p.removes).toEqual(['mine']);
  });
  it('is safe to run twice', () => {
    const pack = [mk('a', '2026-11-29', 1)];
    expect(planLineupUpdate(pack, pack)).toMatchObject({ puts: [], removes: [], unchanged: 1 });
  });
});

describe('missing songs', () => {
  it('lists the songs a line up needs that the phone does not have', () => {
    const l = assignSlot(assignSlot(newLineup('2026-11-29'), 'opening', 'have'), 'welcome', 'gone');
    expect(missingSongIds([l], [song('X', 'A', 'have')])).toEqual(['gone']);
  });
});

describe('searching line ups', () => {
  const songs = [song('Amazing Grace', 'Traditional', 's1'), song('Bahay Kubo', 'Katutubong awit', 's2'), song('Señor Mío', 'Anon', 's3')];
  const l1 = assignSlot(assignSlot(newLineup('2026-11-29'), 'opening', 's1'), 'worship1', 's2');
  const l2 = assignSlot(newLineup('2026-12-06'), 'opening', 's3');
  it('finds line ups by song title, in any case', () => {
    expect(lineupMatches(l1, songs, 'amazing')).toBe(true);
    expect(lineupMatches(l1, songs, 'BAHAY')).toBe(true);
    expect(lineupMatches(l2, songs, 'amazing')).toBe(false);
  });
  it('finds by artist, by date words and by ISO date', () => {
    expect(lineupMatches(l1, songs, 'katutubong')).toBe(true);
    expect(lineupMatches(l1, songs, 'nov 29')).toBe(true);
    expect(lineupMatches(l1, songs, 'sunday')).toBe(true);
    expect(lineupMatches(l2, songs, '2026-12-06')).toBe(true);
    expect(lineupMatches(l2, songs, 'nov')).toBe(false);
  });
  it('ignores accents and needs every word to match', () => {
    expect(lineupMatches(l2, songs, 'senor mio')).toBe(true);
    expect(lineupMatches(l1, songs, 'amazing kubo')).toBe(true);
    expect(lineupMatches(l1, songs, 'amazing zzz')).toBe(false);
  });
  it('an empty search matches everything', () => {
    expect(lineupMatches(l1, songs, '   ')).toBe(true);
  });
});

describe('reference video link', () => {
  it('accepts web links and adds https when it is missing', () => {
    expect(webUrl('https://youtu.be/abc123')).toBe('https://youtu.be/abc123');
    expect(webUrl('  youtube.com/watch?v=xyz ')).toBe('https://youtube.com/watch?v=xyz');
    expect(webUrl('http://example.com/a')).toBe('http://example.com/a');
  });
  it('refuses anything that is not a normal web address', () => {
    for (const bad of ['', '   ', 'javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'intent://x#Intent;end', 'not a link', 'localhost']) expect(webUrl(bad)).toBeNull();
  });
  it('shows the site name', () => {
    expect(webHost('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
  });
  it('travels with the song, and old files without it still work', () => {
    const s = { ...song('Has video'), videoUrl: 'https://youtu.be/abc' };
    const r = parseSongsFile(exportSongs([s]));
    expect(r.ok && r.songs[0]!.videoUrl).toBe('https://youtu.be/abc');
    const old = parseSongsFile(exportSongs([song('No video')]));
    expect(old.ok && old.songs[0]!.videoUrl).toBeUndefined();
  });
  it('drops an unsafe link found in a file', () => {
    const s = { ...song('Sneaky'), videoUrl: 'javascript:alert(1)' };
    const r = parseSongsFile(exportSongs([s]));
    expect(r.ok && r.songs[0]!.videoUrl).toBeUndefined();
  });
});
