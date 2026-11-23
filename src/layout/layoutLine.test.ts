import { describe, expect, it } from 'vitest';
import { layoutLine } from './layoutLine';

// monospace: every char is 10px wide
const m = (s: string) => s.length * 10;
const chord = (id: string, at: number, text: string) => ({ id, at, text });

describe('layoutLine', () => {
  it('puts a chord exactly above its character', () => {
    const [row] = layoutLine('hello world', [chord('a', 6, 'G')], m, m, 1000, 8);
    expect(row!.chords[0]).toMatchObject({ id: 'a', x: 60 });
  });

  it('pushes overlapping chords apart', () => {
    const [row] = layoutLine('abcdefgh', [chord('a', 0, 'Cmaj7'), chord('b', 1, 'G')], m, m, 1000, 8);
    expect(row!.chords.map((c) => c.x)).toEqual([0, 58]); // 5*10 + 8 gap
  });

  it('keeps chord-only lines in order, left to right', () => {
    const [row] = layoutLine('', [chord('a', 0, 'Am'), chord('b', 0, 'C'), chord('c', 0, 'D')], m, m, 1000, 10);
    expect(row!.chords.map((c) => [c.id, c.x])).toEqual([['a', 0], ['b', 30], ['c', 50]]);
  });

  it('word-wraps and re-bases chord offsets per row', () => {
    const rows = layoutLine('one two three four', [chord('a', 8, 'G'), chord('b', 14, 'D')], m, m, 100, 8);
    expect(rows.map((r) => r.text.trimEnd())).toEqual(['one two', 'three four']);
    expect(rows[0]!.chords).toHaveLength(0);
    expect(rows[1]!.chords.map((c) => [c.id, c.x])).toEqual([['a', 0], ['b', 60]]);
  });

  it('a chord on a wrap boundary belongs to the later row', () => {
    const rows = layoutLine('one two three', [chord('a', 8, 'G')], m, m, 80, 8);
    expect(rows[1]!.chords[0]!.id).toBe('a');
    expect(rows[1]!.chords[0]!.x).toBe(0);
  });

  it('chords at the very end stay on the last row', () => {
    const rows = layoutLine('hi there', [chord('a', 8, 'G')], m, m, 1000, 8);
    expect(rows[0]!.chords[0]!.x).toBe(80);
  });

  it('an over-long single word does not loop or drop text', () => {
    const rows = layoutLine('supercalifragilistic ok', [], m, m, 50, 8);
    expect(rows.map((r) => r.text).join('')).toBe('supercalifragilistic ok');
  });

  it('clamps out-of-range anchors', () => {
    const [row] = layoutLine('abc', [chord('a', 99, 'G'), chord('b', -4, 'D')], m, m, 1000, 8);
    expect(row!.chords.map((c) => c.id)).toEqual(['b', 'a']);
  });
});
