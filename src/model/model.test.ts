import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { demoSongs } from './demo';
import { mkLine, mkSection, mkSong } from './build';
import { parseChordSheet } from './importSheet';
import { IndexedDbStore, MemoryStore, type Store } from './store';
import { assignSlot, newLineup } from './lineup';
import {
  applyTranspose,
  displayChord,
  semitonesToKey,
  viewKey,
} from './view';
import { formatKey, parseKey } from '../theory';

const song = mkSong({
  title: 'T',
  key: 'G',
  sections: [mkSection('V', mkLine('hello world', ['hello', 'G'], ['world', 'D/F#']))],
});

describe('displayChord', () => {
  it('is identity by default', () => {
    expect(displayChord('Em7', song, { semitones: 0 })).toBe('Em7');
  });
  it('transposes into the view key with correct spelling', () => {
    expect(displayChord('D/F#', song, { semitones: 3 })).toBe('F/A'); // G -> Bb
    expect(formatKey(viewKey(song, { semitones: 3 })!)).toBe('Bb');
  });
  it('passes unparseable chord text through untouched', () => {
    expect(displayChord('N.C.', song, { semitones: 5 })).toBe('N.C.');
  });
  it('works without a song key (spelling from the song)', () => {
    const s = mkSong({ title: 'x', sections: [mkSection('', mkLine('a', ['a', 'Bb']))] });
    expect(displayChord('Bb', s, { semitones: 1 })).toBe('B');
    expect(displayChord('Bb', s, { semitones: 2 })).toBe('C');
  });
});

describe('semitonesToKey / applyTranspose', () => {
  it('picks the shortest move', () => {
    expect(semitonesToKey(song, parseKey('D')!)).toBe(-5);
    expect(semitonesToKey(song, parseKey('B')!)).toBe(4);
    expect(semitonesToKey(song, parseKey('G')!)).toBe(0);
  });
  it('rewrites chords and key permanently', () => {
    const out = applyTranspose(song, 3);
    expect(out.key).toBe('Bb');
    expect(out.sections[0]!.lines[0]!.chords.map((c) => c.text)).toEqual(['Bb', 'F/A']);
    expect(song.key).toBe('G'); // original untouched
  });
  it('keeps anchors and unparseable chords', () => {
    const s = mkSong({ title: 'x', key: 'C', sections: [mkSection('', mkLine('ab cd', ['cd', 'N.C.']))] });
    const out = applyTranspose(s, 2);
    expect(out.sections[0]!.lines[0]!.chords[0]).toMatchObject({ at: 3, text: 'N.C.' });
  });
});

describe('parseChordSheet', () => {
  const sheet = `[Verse 1]
G           D/F#      Em
Amazing grace, how sweet the sound
   C
That saved a wretch

Chorus:
Am  F  C  G

A
`;
  const secs = parseChordSheet(sheet);
  it('splits sections', () => {
    expect(secs.map((s) => s.label)).toEqual(['Verse 1', 'Chorus']);
  });
  it('anchors chords to lyric columns', () => {
    const l = secs[0]!.lines[0]!;
    expect(l.lyrics).toBe('Amazing grace, how sweet the sound');
    expect(l.chords.map((c) => [c.text, c.at])).toEqual([['G', 0], ['D/F#', 12], ['Em', 22]]);
    expect(secs[0]!.lines[1]!.chords[0]).toMatchObject({ text: 'C', at: 3 });
  });
  it('treats a chord line with no lyric below as chord-only', () => {
    const l = secs[1]!.lines[0]!;
    expect(l.lyrics).toBe('');
    expect(l.chords.map((c) => c.text)).toEqual(['Am', 'F', 'C', 'G']);
  });
  it('does not mistake a lone "A" for a chord', () => {
    expect(secs[1]!.lines[1]).toMatchObject({ lyrics: 'A', chords: [] });
  });
  it('clamps chords past the end of a short lyric line', () => {
    const [s] = parseChordSheet('C          G\nhi');
    expect(s!.lines[0]!.chords.map((c) => c.at)).toEqual([0, 2]);
  });
});

describe('demo songs', () => {
  it('all chords parse', () => {
    for (const s of demoSongs())
      for (const sec of s.sections)
        for (const l of sec.lines)
          for (const c of l.chords) expect(displayChord(c.text, s, { semitones: 0 })).toBe(c.text);
  });
});

function storeSuite(name: string, make: () => Store) {
  describe(`${name} store`, () => {
    it('put/get/list/delete', async () => {
      const store = make();
      expect(await store.list()).toEqual([]);
      const a = mkSong({ title: 'A', updatedAt: 1 });
      const b = mkSong({ title: 'B', updatedAt: 2, sections: [mkSection('x', mkLine('hi', ['hi', 'C']))] });
      await store.put(a);
      await store.put(b);
      expect((await store.list()).map((s) => s.title)).toEqual(['B', 'A']);
      expect(await store.get(b.id)).toEqual(b);
      await store.put({ ...a, title: 'A2', updatedAt: 3 });
      expect((await store.list()).map((s) => s.title)).toEqual(['A2', 'B']);
      await store.delete(a.id);
      expect(await store.get(a.id)).toBeUndefined();
      expect(await store.list()).toHaveLength(1);
    });

    it('line ups: put/get/list (newest date first)/delete, kept apart from songs', async () => {
      const store = make();
      const a = newLineup('2026-11-22');
      const b = assignSlot(newLineup('2026-11-29'), 'opening', 'song-1');
      await store.putLineup(a);
      await store.putLineup(b);
      expect((await store.listLineups()).map((l) => l.date)).toEqual(['2026-11-29', '2026-11-22']);
      expect(await store.getLineup(b.id)).toEqual(b);
      expect(await store.list()).toEqual([]); // line ups are not songs
      await store.putLineup(assignSlot(b, 'welcome', 'song-2'));
      expect((await store.getLineup(b.id))!.slots).toMatchObject({ opening: 'song-1', welcome: 'song-2' });
      await store.deleteLineup(a.id);
      expect(await store.getLineup(a.id)).toBeUndefined();
      expect(await store.listLineups()).toHaveLength(1);
    });
  });
}
storeSuite('memory', () => new MemoryStore());
let n = 0;
storeSuite('indexeddb', () => new IndexedDbStore(`test-${n++}`));

describe('line ups saved before Response existed', () => {
  it('the store hands them back with Response empty', async () => {
    const name = 'legacy-lineup-db';
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name, 2);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('songs', { keyPath: 'id' });
        req.result.createObjectStore('lineups', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const tx = req.result.transaction('lineups', 'readwrite');
        tx.objectStore('lineups').put({ id: 'lu-old', date: '2026-11-22', createdAt: 1, updatedAt: 1,
          slots: { opening: 's1', welcome: null, praise1: null, praise2: null, worship1: null, worship2: null } });
        tx.oncomplete = () => { req.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    const store = new IndexedDbStore(name);
    expect((await store.getLineup('lu-old'))!.slots).toMatchObject({ opening: 's1', response: null });
    expect((await store.listLineups())[0]!.slots.response).toBeNull();
  });
});

describe('upgrading an existing database', () => {
  it('keeps every song saved before line ups existed', async () => {
    const name = 'legacy-db';
    // a version-1 database, as the app created it before line ups
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('songs', { keyPath: 'id' });
      req.onsuccess = () => {
        const tx = req.result.transaction('songs', 'readwrite');
        tx.objectStore('songs').put({ ...mkSong({ title: 'Saved Long Ago', updatedAt: 5 }), id: 'old-1' });
        tx.oncomplete = () => { req.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    const store = new IndexedDbStore(name); // opens at version 2: adds the line ups table
    expect((await store.list()).map((s) => s.title)).toEqual(['Saved Long Ago']);
    expect(await store.listLineups()).toEqual([]);
    await store.putLineup(newLineup('2026-11-29'));
    expect(await store.listLineups()).toHaveLength(1);
    expect(await store.list()).toHaveLength(1);
  });
});
