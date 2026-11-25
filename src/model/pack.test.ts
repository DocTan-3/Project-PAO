import { describe, expect, it } from 'vitest';
import { mkLine, mkSection, mkSong } from './build';
import { mapLine, newSong, setLyrics, setMeta } from './edit';
import { packSignature, planUpdate } from './pack';
import { exportSongs, parseSongsFile, readAdmin } from './share';
import type { Song } from './types';

const song = (title: string, over: Partial<Song> = {}): Song => ({
  ...mkSong({ title, artist: 'A', sections: [mkSection('Verse 1', mkLine('la la'))] }),
  ...over,
});
const admin = (s: Song): Song => ({ ...s, source: 'admin' });

describe('updating from the admin\'s songs', () => {
  it('adds songs the phone does not have, marked as the admin\'s', () => {
    const p = planUpdate([], [song('One', { id: '1' }), song('Two', { id: '2' })]);
    expect(p).toMatchObject({ added: 2, updated: 0, removed: 0 });
    expect(p.puts.every((s) => s.source === 'admin')).toBe(true);
  });
  it('replaces the admin\'s songs with the fresh copy', () => {
    const local = [admin(song('Old', { id: '1', updatedAt: 10 }))];
    const p = planUpdate(local, [song('New', { id: '1', updatedAt: 20 })]);
    expect(p).toMatchObject({ updated: 1, added: 0, removed: 0 });
    expect(p.puts[0]).toMatchObject({ title: 'New', source: 'admin' });
  });
  it('an unchanged song is left alone', () => {
    const local = [admin(song('Same', { id: '1', updatedAt: 10 }))];
    expect(planUpdate(local, [song('Same', { id: '1', updatedAt: 10 })])).toMatchObject({ puts: [], unchanged: 1 });
  });
  it('removes songs the admin no longer publishes', () => {
    const local = [admin(song('Gone', { id: '1' })), admin(song('Stays', { id: '2' }))];
    const p = planUpdate(local, [song('Stays', { id: '2', updatedAt: local[1]!.updatedAt })]);
    expect(p.removes).toEqual(['1']);
    expect(p).toMatchObject({ removed: 1, unchanged: 1 });
  });
  it('never removes or replaces a person\'s own songs', () => {
    const mine = song('My own song', { id: 'mine', updatedAt: 999 });
    const p = planUpdate([mine], [song('Team song', { id: 't' })]);
    expect(p.removes).toEqual([]);
    expect(p.puts.map((s) => s.id)).toEqual(['t']);
    expect(planUpdate([mine], [])).toMatchObject({ removes: [], puts: [], removed: 0 });
  });
  it('keeps a team song the person edited, and does not remove it later', () => {
    const published = song('Team song', { id: 't', updatedAt: 100 });
    const edited = song('My fix', { id: 't', updatedAt: 500 }); // no source: edited here
    expect(planUpdate([edited], [published])).toMatchObject({ keptMine: 1, puts: [], updated: 0 });
    expect(planUpdate([edited], [])).toMatchObject({ removes: [], removed: 0 });
  });
  it('editing a team song in the editor makes it the person\'s own', () => {
    const team = admin(newSong());
    expect(team.source).toBe('admin');
    expect(setMeta(team, { title: 'Changed' }).source).toBeUndefined();
    const line = team.sections[0]!.lines[0]!;
    expect(mapLine(team, line.id, (l) => setLyrics(l, 'new words')).source).toBeUndefined();
  });
  it('adopts a song with the same id that arrived by file, when it is not newer than the published one', () => {
    const received = song('Shared by file', { id: 's', updatedAt: 50 });
    const p = planUpdate([received], [song('Shared by file', { id: 's', updatedAt: 50 })]);
    expect(p.puts[0]).toMatchObject({ id: 's', source: 'admin' });
    const older = song('Shared by file', { id: 's', updatedAt: 10 });
    expect(planUpdate([older], [song('Shared by file v2', { id: 's', updatedAt: 50 })])).toMatchObject({ updated: 1 });
  });
  it('is safe to run twice', () => {
    const pack = [song('A', { id: 'a', updatedAt: 5 }), song('B', { id: 'b', updatedAt: 6 })];
    const first = planUpdate([], pack);
    const second = planUpdate(first.puts, pack);
    expect(second).toMatchObject({ puts: [], added: 0, updated: 0, removed: 0, unchanged: 2 });
  });
});

describe('the published file', () => {
  it('never carries the "source" marker, and records the admin', () => {
    const text = exportSongs([admin(song('X', { id: 'x' }))], 1, { deviceId: 'phone-1', since: 7 });
    expect(text.includes('"source"')).toBe(false);
    expect(readAdmin(text)).toEqual({ deviceId: 'phone-1', since: 7 });
    const parsed = parseSongsFile(text);
    expect(parsed.ok && parsed.songs[0]!.source).toBeUndefined();
  });
  it('readAdmin copes with files that have no admin', () => {
    expect(readAdmin(exportSongs([]))).toBeNull();
    expect(readAdmin('nonsense')).toBeNull();
  });
});

describe('packSignature', () => {
  it('changes when a song is added, edited or removed, but not with order', () => {
    const a = song('A', { id: 'a', updatedAt: 1 }), b = song('B', { id: 'b', updatedAt: 2 });
    const base = packSignature([a, b]);
    expect(packSignature([b, a])).toBe(base);
    expect(packSignature([a])).not.toBe(base);
    expect(packSignature([a, { ...b, updatedAt: 3 }])).not.toBe(base);
    expect(packSignature([a, b, song('C', { id: 'c' })])).not.toBe(base);
  });
});
