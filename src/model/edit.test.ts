import { describe, expect, it } from 'vitest';
import { indexAtX } from '../layout/indexAtX';
import { diatonicChords, formatChord, parseKey } from '../theory';
import { mkLine, mkSection, mkSong } from './build';
import {
  addChord, adjustAnchors, mergeUp, moveChord, removeChord, removeLine, reorderChord, setLyrics,
  splitAt, splitLine, wordStep,
} from './edit';

const at = (line: { chords: { at: number }[] }) => line.chords.map((c) => c.at);

describe('adjustAnchors / setLyrics', () => {
  const base = mkLine('hello world', ['hello', 'G'], ['world', 'D']); // at 0 and 6
  it('keeps a chord on its syllable when text is inserted before it', () => {
    expect(at(setLyrics(base, 'hello big world'))).toEqual([0, 10]);
    expect(at(setLyrics(base, 'Oh hello world'))).toEqual([3, 9]);
  });
  it('keeps chords when text is inserted after them', () => {
    expect(at(setLyrics(base, 'hello world!'))).toEqual([0, 6]);
  });
  it('shifts back when text before is deleted', () => {
    expect(at(setLyrics(base, 'world'))).toEqual([0, 0]);
    expect(at(setLyrics(base, 'ello world'))).toEqual([0, 5]);
  });
  it('clamps a chord whose text was deleted', () => {
    const l = mkLine('abcdef', [3, 'C']);
    expect(at(setLyrics(l, 'abf'))).toEqual([2]);
    expect(at(setLyrics(l, 'af'))).toEqual([1]);
  });
  it('replacement keeps the chord near where it was', () => {
    const l = mkLine('hello world', [8, 'C']);
    expect(at(setLyrics(l, 'hello earth'))).toEqual([8]);
  });
  it('is a no-op for identical text', () => {
    expect(adjustAnchors('a', 'a', base.chords)).toBe(base.chords);
  });
});

describe('split / merge', () => {
  const line = mkLine('hello world', ['hello', 'G'], ['world', 'D'], [11, 'C']);
  it('moves chords at/after the caret to the new line', () => {
    const [a, b] = splitLine(line, 6);
    expect(a.lyrics).toBe('hello ');
    expect(b.lyrics).toBe('world');
    expect(a.chords.map((c) => c.text)).toEqual(['G']);
    expect(b.chords.map((c) => [c.text, c.at])).toEqual([['D', 0], ['C', 5]]);
  });
  it('Enter at end of line keeps all chords on the first line', () => {
    const [a, b] = splitLine(line, 11);
    expect(a.chords).toHaveLength(3);
    expect(b).toMatchObject({ lyrics: '', chords: [] });
  });
  it('merge is the inverse of split', () => {
    const song = mkSong({ title: 't', sections: [mkSection('v', line)] });
    const sp = splitAt(song, line.id, 6)!;
    const mg = mergeUp(sp.song, sp.newLineId)!;
    const merged = mg.song.sections[0]!.lines[0]!;
    expect(merged.lyrics).toBe('hello world');
    expect(at(merged)).toEqual([0, 6, 11]);
    expect(mg.caret).toBe(6);
    expect(mg.song.sections[0]!.lines).toHaveLength(1);
  });
  it('cannot merge the first line of a section', () => {
    const song = mkSong({ title: 't', sections: [mkSection('v', line)] });
    expect(mergeUp(song, line.id)).toBeNull();
  });
});

describe('chord operations', () => {
  it('add, move (clamped), remove', () => {
    const l = mkLine('abc');
    const { line: l1, id } = addChord(l, 99, 'Am');
    expect(at(l1)).toEqual([3]);
    expect(at(moveChord(l1, id, -5))).toEqual([0]);
    expect(removeChord(l1, id).chords).toEqual([]);
  });
  it('reorders chords on a chord-only line', () => {
    const l = mkLine('', [0, 'Am'], [0, 'C'], [0, 'D']);
    const id = l.chords[0]!.id;
    expect(reorderChord(l, id, 1).chords.map((c) => c.text)).toEqual(['C', 'Am', 'D']);
    expect(reorderChord(l, id, -1)).toBe(l);
  });
  it('removeLine keeps at least one line per section', () => {
    const l = mkLine('x');
    const song = mkSong({ title: 't', sections: [mkSection('v', l)] });
    expect(removeLine(song, l.id).sections[0]!.lines).toHaveLength(1);
  });
});

describe('wordStep', () => {
  const t = 'one two  three';
  it('jumps between word starts', () => {
    expect(wordStep(t, 0, 1)).toBe(4);
    expect(wordStep(t, 4, 1)).toBe(9);
    expect(wordStep(t, 9, 1)).toBe(t.length);
    expect(wordStep(t, 9, -1)).toBe(4);
    expect(wordStep(t, 4, -1)).toBe(0);
    expect(wordStep(t, 0, -1)).toBe(0);
  });
});

describe('indexAtX', () => {
  const m = (s: string) => s.length * 10;
  it('snaps to the nearest character boundary', () => {
    expect(indexAtX('hello', 0, m)).toBe(0);
    expect(indexAtX('hello', 14, m)).toBe(1);
    expect(indexAtX('hello', 16, m)).toBe(2);
    expect(indexAtX('hello', 500, m)).toBe(5);
    expect(indexAtX('hello', -20, m)).toBe(0);
    expect(indexAtX('', 40, m)).toBe(0);
  });
});

describe('diatonicChords', () => {
  const names = (k: string) => diatonicChords(parseKey(k)!).map((d) => formatChord(d.chord));
  it('major keys', () => {
    expect(names('G')).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
    expect(names('Bb')).toEqual(['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim']);
  });
  it('minor keys include the borrowed major V', () => {
    expect(names('Am')).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G', 'E']);
  });
});

describe('song notes', () => {
  it('setMeta stores notes without touching sections', async () => {
    const { setMeta } = await import('./edit');
    const s = mkSong({ title: 't', sections: [mkSection('v', mkLine('x'))] });
    const out = setMeta(s, { notes: 'Capo-free. Count in 4.' });
    expect(out.notes).toBe('Capo-free. Count in 4.');
    expect(out.sections).toBe(s.sections);
  });
});
