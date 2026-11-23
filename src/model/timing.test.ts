import { describe, expect, it } from 'vitest';
import { mkLine, mkSection, mkSong } from './build';
import { addTap, bpmFromTaps, clampBpm } from './tapTempo';
import { beatAt, beatsToSeconds, buildTimeline, positionAt } from './timeline';

const song = mkSong({
  title: 't',
  sections: [
    mkSection('v', mkLine('hello world', ['hello', 'G'], ['world', 'D']), mkLine('no chords here'), mkLine('', [0, 'Am'], [0, 'C'])),
    mkSection('c', mkLine('last one', ['last', 'F'])),
  ],
});

describe('buildTimeline', () => {
  const tl = buildTimeline(song, 4);
  it('gives each chord its beats and each line the sum', () => {
    expect(tl.lines.map((l) => [l.start, l.end])).toEqual([[0, 8], [8, 12], [12, 20], [20, 24]]);
    expect(tl.total).toBe(24);
  });
  it('a line with no chords lasts one chord', () => {
    expect(tl.lines[1]!.chords).toEqual([]);
    expect(tl.lines[1]!.end - tl.lines[1]!.start).toBe(4);
  });
  it('orders chords by position, chord-only lines in written order', () => {
    const l = mkLine('abc def', ['def', 'B'], ['abc', 'A']);
    const t = buildTimeline(mkSong({ title: 'x', sections: [mkSection('', l)] }));
    expect(t.lines[0]!.chords.map((c) => c.id)).toEqual([l.chords[1]!.id, l.chords[0]!.id]);
    expect(tl.lines[2]!.chords).toHaveLength(2);
  });
  it('honours a chord\'s own beats and the global default', () => {
    const l = mkLine('a b', ['a', 'G'], ['b', 'D']);
    l.chords[0]!.beats = 2;
    expect(buildTimeline(mkSong({ title: 'x', sections: [mkSection('', l)] }), 4).total).toBe(6);
    expect(buildTimeline(mkSong({ title: 'x', sections: [mkSection('', mkLine('a b', ['a', 'G'], ['b', 'D']))] }), 2).total).toBe(4);
  });
  it('an empty song has no lines', () => {
    expect(buildTimeline(mkSong({ title: 'x' })).total).toBe(0);
    expect(positionAt(buildTimeline(mkSong({ title: 'x' })), 3)).toBeNull();
  });
});

describe('positionAt / beatAt', () => {
  const tl = buildTimeline(song, 4);
  it('finds the line, progress and current chord', () => {
    expect(positionAt(tl, 0)).toMatchObject({ lineIndex: 0, progress: 0, chordId: tl.lines[0]!.chords[0]!.id });
    expect(positionAt(tl, 5)).toMatchObject({ lineIndex: 0, progress: 5 / 8, chordId: tl.lines[0]!.chords[1]!.id });
    expect(positionAt(tl, 8)).toMatchObject({ lineIndex: 1, progress: 0, chordId: null });
    expect(positionAt(tl, 13)!.lineIndex).toBe(2);
  });
  it('clamps before the start and reports the end', () => {
    expect(positionAt(tl, -5)).toMatchObject({ lineIndex: 0, progress: 0 });
    expect(positionAt(tl, 24)).toMatchObject({ lineIndex: 3, progress: 1, finished: true });
    expect(positionAt(tl, 999)!.finished).toBe(true);
  });
  it('beatAt is the inverse of positionAt', () => {
    for (const b of [0, 1.5, 7.9, 8, 11, 12, 19.5, 20, 23.9]) {
      const p = positionAt(tl, b)!;
      expect(beatAt(tl, p.lineIndex, p.progress)).toBeCloseTo(b, 6);
    }
  });
  it('beats convert to seconds at the tempo', () => {
    expect(beatsToSeconds(4, 120)).toBe(2);
    expect(beatsToSeconds(8, 60)).toBe(8);
  });
});

describe('tap tempo', () => {
  const taps = (...gaps: number[]) => gaps.reduce<number[]>((acc, g) => addTap(acc, (acc[acc.length - 1] ?? 0) + g), [0]);
  it('needs two taps', () => {
    expect(bpmFromTaps([])).toBeNull();
    expect(bpmFromTaps([1000])).toBeNull();
  });
  it('500 ms apart is 120 BPM', () => {
    expect(bpmFromTaps(taps(500))).toBe(120);
    expect(bpmFromTaps(taps(500, 500, 500))).toBe(120);
  });
  it('averages uneven taps', () => {
    expect(bpmFromTaps(taps(480, 520, 490, 510))).toBe(120);
    expect(bpmFromTaps(taps(1000, 1000))).toBe(60);
  });
  it('a long pause starts a new count', () => {
    const t = addTap(taps(500, 500), 20000);
    expect(t).toEqual([20000]);
    expect(bpmFromTaps(addTap(t, 20400))).toBe(150);
  });
  it('only the latest taps count, so changing speed is followed', () => {
    const slow = taps(1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000);
    const faster = Array.from({ length: 8 }, () => 500).reduce<number[]>((a, g) => addTap(a, a[a.length - 1]! + g), slow);
    expect(bpmFromTaps(faster)).toBe(120);
  });
  it('clamps to a sensible range', () => {
    expect(clampBpm(5)).toBe(30);
    expect(clampBpm(900)).toBe(300);
    expect(bpmFromTaps([0, 100])).toBe(300);
    expect(bpmFromTaps([0, 2400])).toBe(30);
  });
});
