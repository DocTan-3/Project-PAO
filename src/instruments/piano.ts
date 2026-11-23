import type { Chord } from '../theory/chord';
import { analyzeChord } from './analyze';

export interface PianoVoicing {
  /** MIDI notes, ascending */
  notes: number[];
  rootMidi: number;
  /** "Root position", "1st inversion", ... */
  label: string;
}

const LABELS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

/**
 * Right-hand voicings built from the chord's notes: root position plus its inversions.
 * A slash chord adds its bass note an octave below the lowest note.
 */
export function pianoVoicings(chord: Chord): PianoVoicing[] {
  const t = analyzeChord(chord);
  if (!t) return [];
  // essential notes, plus the 5th unless the chord is extended (where it is normally left out)
  const core = t.tones.filter(
    (x) => x.semis >= 0 && (x.required || (!t.extended && x.semis % 12 === 7)),
  );
  const base = 60 + t.rootPc; // C4 + root
  const stacked = core.map((x) => base + x.semis).sort((a, b) => a - b);
  const out: PianoVoicing[] = [];
  const count = Math.min(stacked.length, 4);
  for (let inv = 0; inv < count; inv++) {
    const notes = stacked.map((m, i) => (i < inv ? m + 12 : m)).sort((a, b) => a - b);
    // bring the voicing down if inverting pushed it above the second octave
    while (Math.max(...notes) > 60 + 12 + 14) for (let i = 0; i < notes.length; i++) notes[i]! -= 12;
    if (t.bassPc !== t.rootPc) notes.unshift(48 + t.bassPc - (48 + t.bassPc >= notes[0]! ? 12 : 0));
    out.push({ notes, rootMidi: base, label: LABELS[inv] ?? `${inv}th inversion` });
  }
  return out;
}
