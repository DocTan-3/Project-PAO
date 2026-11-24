import { describe, expect, it } from 'vitest';
import { mkLine, mkSection, mkSong } from './build';
import { exportFileName, exportSongs, parseSongsFile, planMerge } from './share';
import type { Song } from './types';

const song = (title: string, over: Partial<Song> = {}): Song => ({
  ...mkSong({ title, artist: 'Someone', sections: [mkSection('Verse 1', mkLine('Hello world'))] }),
  ...over,
});

describe('the songs file', () => {
  it('round-trips songs with their chords, language, notes and key', () => {
    const a = song('Amazing Grace', { language: 'en', notes: 'capo free', key: 'G', createdAt: 5, updatedAt: 9 });
    a.sections[0]!.lines[0]!.chords = [{ id: 'c1', at: 3, text: 'G7' }];
    const b = song('Bahay Kubo', { language: 'tl', createdAt: 6, updatedAt: 7 });
    const parsed = parseSongsFile(exportSongs([a, b]));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.invalid).toBe(0);
      expect(parsed.songs).toEqual([a, b]);
    }
  });
  it('names the file with the date', () => {
    expect(exportFileName(new Date(2026, 10, 4))).toBe('BPCG-PAW-songs-2026-11-04.json');
  });
  it('rejects things that are not songs files', () => {
    for (const text of ['', 'hello', '[]', '{}', '{"app":"other","songs":[]}', '{"app":"bpcg-paw-songs"}']) {
      const r = parseSongsFile(text);
      expect(r.ok).toBe(false);
    }
  });
  it('refuses a file from a newer version', () => {
    const r = parseSongsFile(JSON.stringify({ app: 'bpcg-paw-songs', version: 99, songs: [] }));
    expect(r).toEqual({ ok: false, error: expect.stringContaining('newer version') });
  });
  it('skips broken songs and keeps the good ones', () => {
    const good = song('Good');
    const file = JSON.stringify({
      app: 'bpcg-paw-songs',
      version: 1,
      songs: [good, { id: 'x', title: 5 }, { id: 'y', title: 'No sections' }, null, { ...good, id: 'z', sections: [{ id: 's', lines: [{ id: 'l', lyrics: 1, chords: [] }] }] }],
    });
    const r = parseSongsFile(file);
    expect(r.ok && r.songs.map((s) => s.title)).toEqual(['Good']);
    expect(r.ok && r.invalid).toBe(4);
  });
  it('rejects chords with a bad position', () => {
    const bad = song('Bad');
    bad.sections[0]!.lines[0]!.chords = [{ id: 'c', at: -1, text: 'G' }];
    const r = parseSongsFile(exportSongs([bad]));
    expect(r.ok && r.songs).toEqual([]);
  });
  it('does not trust extra fields', () => {
    const s = { ...song('Plain'), evil: '<script>', __proto__: { polluted: true } } as unknown as Song;
    const r = parseSongsFile(exportSongs([s]));
    expect(r.ok && Object.keys(r.songs[0]!).sort()).toEqual(['artist', 'createdAt', 'id', 'key', 'sections', 'title', 'updatedAt']);
  });
});

describe('merging: the newer one wins', () => {
  it('adds songs the receiver does not have', () => {
    const p = planMerge([song('A')], [song('B'), song('C')]);
    expect(p).toMatchObject({ added: 2, updated: 0, unchanged: 0 });
    expect(p.puts.map((s) => s.title).sort()).toEqual(['B', 'C']);
  });
  it('replaces a song with the same id when the incoming copy is newer', () => {
    const mine = song('Old title', { id: 's1', updatedAt: 100 });
    const theirs = song('New title', { id: 's1', updatedAt: 200 });
    const p = planMerge([mine], [theirs]);
    expect(p).toMatchObject({ added: 0, updated: 1, unchanged: 0 });
    expect(p.puts[0]!.title).toBe('New title');
  });
  it('keeps my song when mine is newer or the same age', () => {
    const mine = song('Mine', { id: 's1', updatedAt: 300 });
    expect(planMerge([mine], [song('Theirs', { id: 's1', updatedAt: 200 })])).toMatchObject({ puts: [], unchanged: 1 });
    expect(planMerge([mine], [song('Theirs', { id: 's1', updatedAt: 300 })])).toMatchObject({ puts: [], unchanged: 1 });
  });
  it('matches the same title and artist from another phone and keeps the local id', () => {
    const mine = song('Amazing Grace', { id: 'mine', createdAt: 1, updatedAt: 100 });
    const theirs = song(' amazing grace ', { id: 'theirs', artist: 'SOMEONE', createdAt: 50, updatedAt: 500 });
    const p = planMerge([mine], [theirs]);
    expect(p).toMatchObject({ added: 0, updated: 1 });
    expect(p.puts[0]!.id).toBe('mine');
    expect(p.puts[0]!.createdAt).toBe(1);
    expect(p.puts[0]!.sections).toEqual(theirs.sections);
  });
  it('does not merge different songs that only share a title with another artist', () => {
    const mine = song('Hosanna', { id: 'a', artist: 'Hillsong', updatedAt: 100 });
    const theirs = song('Hosanna', { id: 'b', artist: 'Planetshakers', updatedAt: 500 });
    expect(planMerge([mine], [theirs])).toMatchObject({ added: 1, updated: 0 });
  });
  it('an older copy of the same song changes nothing', () => {
    const mine = song('Same', { id: 'a', updatedAt: 500 });
    const theirs = song('Same', { id: 'b', updatedAt: 100 });
    expect(planMerge([mine], [theirs])).toMatchObject({ puts: [], unchanged: 1, added: 0 });
  });
  it('handles two copies of one song inside the file: the newest wins', () => {
    const p = planMerge([], [song('Dup', { id: 'a', updatedAt: 100 }), song('Dup', { id: 'b', updatedAt: 200 })]);
    expect(p.puts).toHaveLength(1);
    expect(p.puts[0]!.updatedAt).toBe(200);
    expect(p).toMatchObject({ added: 1, updated: 0 });
  });
  it('is safe to receive the same file twice', () => {
    const lib = [song('A', { id: 'a', updatedAt: 10 })];
    const file = [song('B', { id: 'b', updatedAt: 20 })];
    const first = planMerge(lib, file);
    const second = planMerge([...lib, ...first.puts], file);
    expect(first.added).toBe(1);
    expect(second).toMatchObject({ added: 0, updated: 0, unchanged: 1, puts: [] });
  });
  it('empty file changes nothing', () => {
    expect(planMerge([song('A')], [])).toEqual({ puts: [], added: 0, updated: 0, unchanged: 0 });
  });
});
