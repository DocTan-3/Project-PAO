export interface ChordIn {
  id: string;
  at: number;
  text: string;
}

export interface ChordOut {
  id: string;
  text: string;
  /** character index in the full lyric line (for the editor) */
  at: number;
  /** left offset in px from the row's start */
  x: number;
}

export interface Row {
  /** lyric char range [start, end) shown in this row */
  start: number;
  end: number;
  text: string;
  chords: ChordOut[];
}

/**
 * Lay a lyric line out into visual rows: word-wrap the lyrics to `maxWidth`,
 * put each chord exactly above the character it is anchored to, and nudge
 * chords right when they would overlap. `measure` returns the px width of text.
 */
export function layoutLine(
  lyrics: string,
  chords: readonly ChordIn[],
  measureLyric: (s: string) => number,
  measureChord: (s: string) => number,
  maxWidth: number,
  gap: number,
): Row[] {
  // 1. word-wrap
  const bounds: [number, number][] = [];
  let start = 0;
  const wordRe = /\s*\S+\s*/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(lyrics))) {
    const ts = m.index;
    const visibleEnd = ts + m[0].trimEnd().length;
    if (ts > start && measureLyric(lyrics.slice(start, visibleEnd)) > maxWidth) {
      bounds.push([start, ts]);
      start = ts;
    }
  }
  bounds.push([start, lyrics.length]);

  // 2. assign chords to rows (a chord on a wrap boundary goes to the later row)
  const sorted = chords
    .map((c, i) => ({ c, i, at: Math.max(0, Math.min(c.at, lyrics.length)) }))
    .sort((a, b) => a.at - b.at || a.i - b.i);

  return bounds.map(([s, e], rowIdx) => {
    const last = rowIdx === bounds.length - 1;
    const mine = sorted.filter(({ at }) => at >= s && (at < e || last));
    const out: ChordOut[] = [];
    let minX = 0;
    for (const { c, at } of mine) {
      const x = Math.max(measureLyric(lyrics.slice(s, at)), minX);
      out.push({ id: c.id, text: c.text, at: c.at, x });
      minX = x + measureChord(c.text) + gap;
    }
    return { start: s, end: e, text: lyrics.slice(s, e), chords: out };
  });
}
