import type { Song } from './types';

export interface TimelineChord {
  id: string;
  start: number;
  end: number;
}
export interface TimelineLine {
  id: string;
  start: number;
  end: number;
  chords: TimelineChord[];
}
export interface Timeline {
  lines: TimelineLine[];
  /** length of the whole song in beats */
  total: number;
}

export const DEFAULT_BEATS_PER_CHORD = 4;

/**
 * Lay the song out in time. Every chord lasts `chord.beats` (or `beatsPerChord`),
 * a line lasts as long as its chords, and a line with no chords lasts one chord's worth.
 */
export function buildTimeline(song: Song, beatsPerChord = DEFAULT_BEATS_PER_CHORD): Timeline {
  const lines: TimelineLine[] = [];
  let t = 0;
  for (const sec of song.sections) {
    for (const line of sec.lines) {
      const start = t;
      const chords: TimelineChord[] = [];
      const ordered = line.lyrics.length === 0
        ? line.chords // chord-only lines are played in the order written
        : line.chords.map((c, i) => ({ c, i })).sort((a, b) => a.c.at - b.c.at || a.i - b.i).map((x) => x.c);
      for (const c of ordered) {
        const len = c.beats && c.beats > 0 ? c.beats : beatsPerChord;
        chords.push({ id: c.id, start: t, end: t + len });
        t += len;
      }
      if (chords.length === 0) t += beatsPerChord;
      lines.push({ id: line.id, start, end: t, chords });
    }
  }
  return { lines, total: t };
}

export interface Position {
  lineIndex: number;
  /** 0..1 through the line */
  progress: number;
  chordId: string | null;
  finished: boolean;
}

/** Where the song is at a given beat. Null for an empty song. */
export function positionAt(tl: Timeline, beat: number): Position | null {
  if (tl.lines.length === 0) return null;
  if (beat >= tl.total) {
    const last = tl.lines.length - 1;
    return { lineIndex: last, progress: 1, chordId: null, finished: true };
  }
  const b = Math.max(0, beat);
  let lo = 0;
  let hi = tl.lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tl.lines[mid]!.start <= b) lo = mid;
    else hi = mid - 1;
  }
  const line = tl.lines[lo]!;
  const span = line.end - line.start;
  const chord = line.chords.find((c) => b >= c.start && b < c.end) ?? null;
  return { lineIndex: lo, progress: span > 0 ? (b - line.start) / span : 0, chordId: chord?.id ?? null, finished: false };
}

/** The beat at `progress` (0..1) through line `lineIndex`. */
export function beatAt(tl: Timeline, lineIndex: number, progress: number): number {
  const line = tl.lines[Math.max(0, Math.min(lineIndex, tl.lines.length - 1))];
  if (!line) return 0;
  return line.start + (line.end - line.start) * Math.max(0, Math.min(1, progress));
}

export const beatsToSeconds = (beats: number, bpm: number): number => (beats * 60) / bpm;
