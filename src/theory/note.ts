export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

/** A spelled note. accidental: -1 = flat, +1 = sharp (double allowed). */
export interface Note {
  letter: Letter;
  accidental: number;
}

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const LETTER_PC: Record<Letter, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** Position of the major key on the circle of fifths (C=0, G=1, F=-1). */
const LETTER_FIFTHS: Record<Letter, number> = {
  F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5,
};

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export function pitchClass(n: Note): number {
  return mod(LETTER_PC[n.letter] + n.accidental, 12);
}

export type Spelling = 'sharps' | 'flats';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Spell a pitch class with a simple sharps-or-flats preference. */
export function spellPitchClass(pc: number, spelling: Spelling): Note {
  const name = (spelling === 'sharps' ? SHARP_NAMES : FLAT_NAMES)[mod(pc, 12)]!;
  return parseNote(name)!;
}

export function parseNote(s: string): Note | null {
  const m = /^([A-G])([#b♯♭]{0,2})$/.exec(s);
  if (!m) return null;
  const acc = m[2]!;
  let accidental = 0;
  for (const ch of acc) accidental += ch === '#' || ch === '♯' ? 1 : -1;
  return { letter: m[1] as Letter, accidental };
}

export function formatNote(n: Note): string {
  const a = n.accidental;
  return n.letter + (a > 0 ? '#'.repeat(a) : 'b'.repeat(-a));
}

/** Circle-of-fifths position of `n` treated as a major tonic. */
export function majorFifths(n: Note): number {
  return LETTER_FIFTHS[n.letter] + 7 * n.accidental;
}
