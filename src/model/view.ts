import {
  type Key,
  type Spelling,
  capoShape,
  capoShapeKey,
  formatChord,
  formatKey,
  parseChord,
  parseKey,
  semitonesBetween,
  transposeChord,
  transposeKey,
} from '../theory';
import type { Song, ViewSettings } from './types';

export const DEFAULT_VIEW: ViewSettings = { semitones: 0, capo: 0 };

export function songKeyOf(song: Song): Key | null {
  return song.key ? parseKey(song.key) : null;
}

/** Fallback spelling when a song has no key: flats if its chords use flats. */
export function songSpelling(song: Song): Spelling {
  let flats = 0;
  let sharps = 0;
  for (const s of song.sections)
    for (const l of s.lines)
      for (const c of l.chords) {
        const p = parseChord(c.text);
        if (!p) continue;
        if (p.root.accidental < 0) flats++;
        if (p.root.accidental > 0) sharps++;
      }
  return flats > sharps ? 'flats' : 'sharps';
}

/** The key the song sounds in under this view (after transpose). */
export function viewKey(song: Song, v: ViewSettings): Key | null {
  const k = songKeyOf(song);
  return k ? transposeKey(k, v.semitones) : null;
}

/** The key whose shapes you finger (after transpose and capo). */
export function shapeKey(song: Song, v: ViewSettings): Key | null {
  const k = viewKey(song, v);
  return k ? capoShapeKey(k, v.capo) : null;
}

/** Chord text to display under this view. Unparseable chords pass through untouched. */
export function displayChord(text: string, song: Song, v: ViewSettings): string {
  const parsed = parseChord(text);
  if (!parsed) return text;
  const vk = viewKey(song, v);
  const spelling = songSpelling(song);
  const sounding = transposeChord(parsed, v.semitones, vk ?? spelling);
  if (v.capo === 0) return formatChord(sounding);
  const shape = vk
    ? capoShape(sounding, v.capo, capoShapeKey(vk, v.capo))
    : transposeChord(sounding, -v.capo, spelling);
  return formatChord(shape);
}

/** View offset (in -5..6 semitones, shortest move) that puts the song in `target`. */
export function semitonesToKey(song: Song, target: Key): number | null {
  const k = songKeyOf(song);
  if (!k) return null;
  const up = semitonesBetween(k, target);
  return up > 6 ? up - 12 : up;
}

/** Permanently rewrite the song's chords (and key) by `semitones`. */
export function applyTranspose(song: Song, semitones: number): Song {
  if (semitones === 0) return song;
  const k = songKeyOf(song);
  const nk = k ? transposeKey(k, semitones) : null;
  const target = nk ?? songSpelling(song);
  return {
    ...song,
    key: nk ? formatKey(nk) : song.key,
    updatedAt: Date.now(),
    sections: song.sections.map((s) => ({
      ...s,
      lines: s.lines.map((l) => ({
        ...l,
        chords: l.chords.map((c) => {
          const p = parseChord(c.text);
          return p ? { ...c, text: formatChord(transposeChord(p, semitones, target)) } : c;
        }),
      })),
    })),
  };
}
