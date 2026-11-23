import type { Chord } from './chord';
import { type Key, spellInKey } from './key';
import { type Note, type Spelling, mod, pitchClass, spellPitchClass } from './note';

/** How to spell notes after transposing: a key (best), or plain sharps/flats. */
export type SpellTarget = Key | Spelling;

function spell(pc: number, target: SpellTarget): Note {
  return typeof target === 'string' ? spellPitchClass(pc, target) : spellInKey(pc, target);
}

export function transposeNote(n: Note, semitones: number, target: SpellTarget): Note {
  return spell(mod(pitchClass(n) + semitones, 12), target);
}

export function transposeChord(c: Chord, semitones: number, target: SpellTarget): Chord {
  const out: Chord = { root: transposeNote(c.root, semitones, target), suffix: c.suffix };
  if (c.bass) out.bass = transposeNote(c.bass, semitones, target);
  return out;
}
