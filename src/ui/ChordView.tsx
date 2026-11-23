import { useMemo } from 'preact/hooks';
import { frettedVoicings, pianoVoicings, type Instrument } from '../instruments';
import { analyzeChord } from '../instruments/analyze';
import { type Chord, formatNote, parseChord, spellInKey } from '../theory';
import { FretDiagram } from './FretDiagram';
import { PianoDiagram } from './PianoDiagram';

export const INSTRUMENTS: { id: Instrument; label: string }[] = [
  { id: 'guitar', label: 'Guitar' },
  { id: 'ukulele', label: 'Ukulele' },
  { id: 'piano', label: 'Piano' },
];

export function loadInstrument(): Instrument {
  try {
    const v = localStorage.getItem('pao:instrument');
    if (v === 'guitar' || v === 'ukulele' || v === 'piano') return v;
  } catch {
    /* storage unavailable */
  }
  return 'guitar';
}
export function saveInstrument(i: Instrument): void {
  try {
    localStorage.setItem('pao:instrument', i);
  } catch {
    /* ignore */
  }
}

/** Interval-correct note names for a chord: Gm is G Bb D, not G A# D. */
export function chordNoteNames(chord: Chord): string[] {
  const t = analyzeChord(chord);
  if (!t) return [];
  const key = { tonic: chord.root, mode: 'major' as const };
  return t.tones.map((x) => formatNote(spellInKey(x.pc, key)));
}

/** How many alternative shapes exist for this chord on this instrument. */
export function shapeCount(chord: Chord | null, instrument: Instrument): number {
  if (!chord) return 0;
  return instrument === 'piano' ? pianoVoicings(chord).length : frettedVoicings(chord, instrument, 5).length;
}

/** The diagram for one chord. `shape` picks an alternative voicing. */
export function ChordDiagram({
  text,
  instrument,
  shape = 0,
  width,
}: {
  text: string;
  instrument: Instrument;
  shape?: number;
  width: number;
}) {
  const chord = useMemo(() => parseChord(text), [text]);
  const body = useMemo(() => {
    if (!chord) return null;
    if (instrument === 'piano') {
      const list = pianoVoicings(chord);
      const v = list[Math.min(shape, list.length - 1)];
      if (!v) return null;
      const spell = new Map(
        (analyzeChord(chord)?.tones ?? []).map((t, i) => [t.pc, chordNoteNames(chord)[i] ?? '']),
      );
      return (
        <PianoDiagram
          notes={v.notes}
          rootMidi={v.rootMidi}
          names={(pc) => spell.get(pc) ?? ''}
          width={width}
          label={`${text} on piano`}
        />
      );
    }
    const list = frettedVoicings(chord, instrument, 5);
    const v = list[Math.min(shape, list.length - 1)];
    return v ? <FretDiagram voicing={v} width={width} label={`${text} on ${instrument}`} /> : null;
  }, [chord, instrument, shape, width, text]);

  return body ?? <div class="no-diagram" style={{ width: `${width}px` }}>No diagram</div>;
}
