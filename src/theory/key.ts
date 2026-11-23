import {
  LETTERS,
  LETTER_PC,
  type Note,
  type Spelling,
  formatNote,
  majorFifths,
  mod,
  parseNote,
  pitchClass,
  spellPitchClass,
} from './note';

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: Note;
  mode: Mode;
}

/** "F#m" / "Bb" / "A" -> Key. */
export function parseKey(s: string): Key | null {
  const m = /^([A-G][#b♯♭]?)(m|min|minor)?$/.exec(s.trim());
  if (!m) return null;
  const tonic = parseNote(m[1]!);
  if (!tonic) return null;
  return { tonic, mode: m[2] ? 'minor' : 'major' };
}

export function formatKey(k: Key): string {
  return formatNote(k.tonic) + (k.mode === 'minor' ? 'm' : '');
}

/** Number of sharps (+) or flats (-) in the key signature. */
export function keyFifths(k: Key): number {
  const f = majorFifths(k.tonic);
  return k.mode === 'major' ? f : f - 3;
}

export function keySpelling(k: Key): Spelling {
  return keyFifths(k) < 0 ? 'flats' : 'sharps';
}

// Interval above the tonic -> letter steps and conventional name:
// 1 b2 2 b3 3 4 #4 5 b6 6 b7 7 (same table works for major and minor keys).
const LETTER_STEPS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

/**
 * Spell a pitch class relative to a key, by scale degree, so that
 * Eb in C major is "Eb" (b3) and G# in A minor is "G#" (7).
 * Falls back to key-signature preference if that needs a double accidental.
 */
export function spellInKey(pc: number, key: Key): Note {
  const tonicPc = pitchClass(key.tonic);
  const interval = mod(pc - tonicPc, 12);
  const tonicIdx = LETTERS.indexOf(key.tonic.letter);
  const letter = LETTERS[(tonicIdx + LETTER_STEPS[interval]!) % 7]!;
  const accidental = mod(pc - LETTER_PC[letter] + 6, 12) - 6;
  if (Math.abs(accidental) <= 1) return { letter, accidental };
  return spellPitchClass(pc, keySpelling(key));
}

/**
 * Transpose a key by `semitones`, choosing the enharmonic spelling with the
 * simpler key signature (Db not C#, B not Cb). Ties use `tiebreak`.
 */
export function transposeKey(
  key: Key,
  semitones: number,
  tiebreak: Spelling = keySpelling(key),
): Key {
  const pc = mod(pitchClass(key.tonic) + semitones, 12);
  const sharp = spellPitchClass(pc, 'sharps');
  const flat = spellPitchClass(pc, 'flats');
  const a: Key = { tonic: sharp, mode: key.mode };
  const b: Key = { tonic: flat, mode: key.mode };
  const fa = Math.abs(keyFifths(a));
  const fb = Math.abs(keyFifths(b));
  if (fa < fb) return a;
  if (fb < fa) return b;
  return tiebreak === 'sharps' ? a : b;
}

/** Semitones to move from one key's tonic up to another's (0-11). */
export function semitonesBetween(from: Key, to: Key): number {
  return mod(pitchClass(to.tonic) - pitchClass(from.tonic), 12);
}
