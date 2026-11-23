import { mkLine, mkSection, mkSong } from './build';
import { uid } from './id';
import type { Line, PlacedChord, Section, Song } from './types';

/**
 * Keep chords attached to the same syllables when lyrics are edited.
 * Finds the changed region (common prefix/suffix) and shifts anchors after it.
 */
export function adjustAnchors(oldText: string, newText: string, chords: PlacedChord[]): PlacedChord[] {
  if (oldText === newText) return chords;
  const max = Math.min(oldText.length, newText.length);
  let p = 0;
  while (p < max && oldText[p] === newText[p]) p++;
  let s = 0;
  while (s < max - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++;
  const oldEnd = oldText.length - s;
  const delta = newText.length - oldText.length;
  const newMid = newText.length - s - p;
  return chords.map((c) => {
    let at = c.at;
    if (at < p) {
      /* before the change */
    } else if (at >= oldEnd) at += delta;
    else at = p + Math.min(at - p, newMid);
    at = Math.max(0, Math.min(newText.length, at));
    return at === c.at ? c : { ...c, at };
  });
}

export function setLyrics(line: Line, lyrics: string): Line {
  return { ...line, lyrics, chords: adjustAnchors(line.lyrics, lyrics, line.chords) };
}

/** Split at the caret (Enter). Chords at/after the caret move to the new line. */
export function splitLine(line: Line, caret: number): [Line, Line] {
  const keepAll = caret >= line.lyrics.length;
  const head = line.chords.filter((c) => keepAll || c.at < caret);
  const tail = keepAll ? [] : line.chords.filter((c) => c.at >= caret).map((c) => ({ ...c, at: c.at - caret }));
  return [
    { ...line, lyrics: line.lyrics.slice(0, caret), chords: head },
    { id: uid(), lyrics: line.lyrics.slice(caret), chords: tail },
  ];
}

/** Join `b` onto the end of `a` (Backspace at the start of a line). */
export function mergeLines(a: Line, b: Line): Line {
  return {
    ...a,
    lyrics: a.lyrics + b.lyrics,
    chords: [...a.chords, ...b.chords.map((c) => ({ ...c, at: c.at + a.lyrics.length }))],
  };
}

/** Next/previous word start from `at` (end of text / start of text at the edges). */
export function wordStep(lyrics: string, at: number, dir: 1 | -1): number {
  const isStart = (i: number) => i === 0 || (/\s/.test(lyrics[i - 1] ?? '') && !/\s/.test(lyrics[i] ?? ''));
  if (dir === 1) {
    for (let i = at + 1; i < lyrics.length; i++) if (isStart(i)) return i;
    return lyrics.length;
  }
  for (let i = at - 1; i > 0; i--) if (isStart(i)) return i;
  return 0;
}

export function addChord(line: Line, at: number, text: string): { line: Line; id: string } {
  const id = uid();
  const clamped = Math.max(0, Math.min(at, line.lyrics.length));
  return { line: { ...line, chords: [...line.chords, { id, at: clamped, text }] }, id };
}

export function moveChord(line: Line, id: string, at: number): Line {
  const clamped = Math.max(0, Math.min(at, line.lyrics.length));
  return { ...line, chords: line.chords.map((c) => (c.id === id ? { ...c, at: clamped } : c)) };
}

export function setChordText(line: Line, id: string, text: string): Line {
  return { ...line, chords: line.chords.map((c) => (c.id === id ? { ...c, text } : c)) };
}

/** How many beats a chord lasts for autoscroll. `undefined` removes the override (the default applies). */
export function setChordBeats(line: Line, id: string, beats: number | undefined): Line {
  return {
    ...line,
    chords: line.chords.map((c) => {
      if (c.id !== id) return c;
      const { beats: _old, ...rest } = c;
      void _old;
      return beats && beats > 0 ? { ...rest, beats } : rest;
    }),
  };
}

export function removeChord(line: Line, id: string): Line {
  return { ...line, chords: line.chords.filter((c) => c.id !== id) };
}

/** Swap a chord with its neighbour in the array (used on chord-only lines, where order is position). */
export function reorderChord(line: Line, id: string, dir: 1 | -1): Line {
  const i = line.chords.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= line.chords.length) return line;
  const chords = [...line.chords];
  [chords[i], chords[j]] = [chords[j]!, chords[i]!];
  return { ...line, chords };
}

// ---- song-level operations (all immutable) ----

const touch = (song: Song): Song => ({ ...song, updatedAt: Date.now() });

export function newSong(): Song {
  return mkSong({ title: '', sections: [mkSection('Verse 1', mkLine(''))] });
}

export function mapLine(song: Song, lineId: string, fn: (l: Line) => Line): Song {
  return touch({
    ...song,
    sections: song.sections.map((s) => ({ ...s, lines: s.lines.map((l) => (l.id === lineId ? fn(l) : l)) })),
  });
}

export function insertLineAfter(song: Song, afterId: string, line: Line): Song {
  return touch({
    ...song,
    sections: song.sections.map((s) => {
      const i = s.lines.findIndex((l) => l.id === afterId);
      if (i < 0) return s;
      return { ...s, lines: [...s.lines.slice(0, i + 1), line, ...s.lines.slice(i + 1)] };
    }),
  });
}

/** Enter: split the line at the caret. Returns the id of the new (lower) line. */
export function splitAt(song: Song, lineId: string, caret: number): { song: Song; newLineId: string } | null {
  for (const s of song.sections) {
    const line = s.lines.find((l) => l.id === lineId);
    if (!line) continue;
    const [a, b] = splitLine(line, caret);
    return { song: insertLineAfter(mapLine(song, lineId, () => a), lineId, b), newLineId: b.id };
  }
  return null;
}

/** Backspace at column 0: merge into the previous line of the same section. */
export function mergeUp(song: Song, lineId: string): { song: Song; prevId: string; caret: number } | null {
  for (const s of song.sections) {
    const i = s.lines.findIndex((l) => l.id === lineId);
    if (i <= 0) continue;
    const prev = s.lines[i - 1]!;
    const merged = mergeLines(prev, s.lines[i]!);
    return {
      song: touch({
        ...song,
        sections: song.sections.map((sec) =>
          sec.id === s.id
            ? { ...sec, lines: sec.lines.filter((_, idx) => idx !== i).map((l) => (l.id === prev.id ? merged : l)) }
            : sec,
        ),
      }),
      prevId: prev.id,
      caret: prev.lyrics.length,
    };
  }
  return null;
}

export function removeLine(song: Song, lineId: string): Song {
  return touch({
    ...song,
    sections: song.sections.map((s) =>
      s.lines.length > 1 ? { ...s, lines: s.lines.filter((l) => l.id !== lineId) } : s,
    ),
  });
}

export function addLineToSection(song: Song, sectionId: string): { song: Song; lineId: string } {
  const line = mkLine('');
  return {
    song: touch({
      ...song,
      sections: song.sections.map((s) => (s.id === sectionId ? { ...s, lines: [...s.lines, line] } : s)),
    }),
    lineId: line.id,
  };
}

export function addSection(song: Song, label: string): Song {
  return touch({ ...song, sections: [...song.sections, mkSection(label, mkLine(''))] });
}

export function removeSection(song: Song, sectionId: string): Song {
  return touch({ ...song, sections: song.sections.filter((s) => s.id !== sectionId) });
}

export function setSectionLabel(song: Song, sectionId: string, label: string): Song {
  return touch({ ...song, sections: song.sections.map((s): Section => (s.id === sectionId ? { ...s, label } : s)) });
}

export function setMeta(song: Song, patch: Partial<Pick<Song, 'title' | 'artist' | 'notes' | 'key' | 'bpm'>>): Song {
  return touch({ ...song, ...patch });
}
