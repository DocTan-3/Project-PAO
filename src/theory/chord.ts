import { type Note, formatNote, parseNote } from './note';

/**
 * A chord = spelled root + quality/extension suffix + optional bass note.
 * The suffix ("m7b5", "sus4", "add9", ...) is kept verbatim: transposing only
 * moves the root and bass, so no chord text is ever lost or rewritten.
 */
export interface Chord {
  root: Note;
  suffix: string;
  bass?: Note;
}

// Tokens that may appear in a suffix. Deliberately permissive about order but
// strict about alphabet, so "Bad" or "Hello" are not mistaken for chords.
const SUFFIX = /^(?:maj|min|dim|aug|sus|add|alt|no|m|M|\+|°|ø|-|6\/9|[#b♯♭]?\d+|\(|\)|,)*$/;

export function parseChord(text: string): Chord | null {
  const m = /^([A-G](?:[#b♯♭])?)((?:6\/9|[^/])*)(?:\/([A-G](?:[#b♯♭])?))?$/.exec(text.trim());
  if (!m) return null;
  const root = parseNote(m[1]!);
  if (!root) return null;
  const suffix = m[2]!;
  if (!SUFFIX.test(suffix)) return null;
  const chord: Chord = { root, suffix };
  if (m[3]) {
    const bass = parseNote(m[3]);
    if (!bass) return null;
    chord.bass = bass;
  }
  return chord;
}

export function formatChord(c: Chord): string {
  return formatNote(c.root) + c.suffix + (c.bass ? '/' + formatNote(c.bass) : '');
}
