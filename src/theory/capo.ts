import type { Chord } from './chord';
import { type Key, formatKey, transposeKey } from './key';
import { transposeChord } from './transpose';

/**
 * Songs are stored as SOUNDING chords in the song key. With a capo on fret N
 * the player fingers shapes N semitones lower; the sounding pitch is unchanged.
 */
export function capoShapeKey(songKey: Key, capo: number): Key {
  return transposeKey(songKey, -capo);
}

export function capoShape(chord: Chord, capo: number, shapeKey: Key): Chord {
  return transposeChord(chord, -capo, shapeKey);
}

// Keys whose shapes are easy on guitar (open chords), best first.
const FRIENDLY = ['G', 'C', 'D', 'A', 'E', 'Em', 'Am', 'Dm'];

export interface CapoOption {
  capo: number;
  shapeKey: Key;
  /** true when the shape key is one of the common open-chord keys */
  friendly: boolean;
}

/** Capo positions 0..maxCapo with the resulting shape key, friendliest first. */
export function capoSuggestions(songKey: Key, maxCapo = 9): CapoOption[] {
  const options: CapoOption[] = [];
  for (let capo = 0; capo <= maxCapo; capo++) {
    const shapeKey = capoShapeKey(songKey, capo);
    options.push({ capo, shapeKey, friendly: FRIENDLY.includes(formatKey(shapeKey)) });
  }
  const rank = (o: CapoOption) => {
    const i = FRIENDLY.indexOf(formatKey(o.shapeKey));
    return i === -1 ? FRIENDLY.length : i;
  };
  return options.sort((a, b) => rank(a) - rank(b) || a.capo - b.capo);
}
