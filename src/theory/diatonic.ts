import type { Chord } from './chord';
import { type Key, spellInKey } from './key';
import { pitchClass } from './note';

export interface DiatonicChord {
  numeral: string;
  chord: Chord;
}

const MAJOR: [number, string, string][] = [
  [0, '', 'I'], [2, 'm', 'ii'], [4, 'm', 'iii'], [5, '', 'IV'], [7, '', 'V'], [9, 'm', 'vi'], [11, 'dim', 'vii°'],
];
// natural minor, plus the major V that most songs borrow from harmonic minor
const MINOR: [number, string, string][] = [
  [0, 'm', 'i'], [2, 'dim', 'ii°'], [3, '', 'III'], [5, 'm', 'iv'], [7, 'm', 'v'], [8, '', 'VI'], [10, '', 'VII'], [7, '', 'V'],
];

/** The chords that belong to a key, spelled for it: the quick-pick row in the editor. */
export function diatonicChords(key: Key): DiatonicChord[] {
  const tonic = pitchClass(key.tonic);
  return (key.mode === 'major' ? MAJOR : MINOR).map(([semi, suffix, numeral]) => ({
    numeral,
    chord: { root: spellInKey((tonic + semi) % 12, key), suffix },
  }));
}
