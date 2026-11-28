import type { Instrument } from '../instruments';
import { ChordDiagram, INSTRUMENTS } from './ChordView';

export function InstrumentSwitch({ value, onChange }: { value: Instrument; onChange: (i: Instrument) => void }) {
  return (
    <div class="seg" role="radiogroup" aria-label="Instrument">
      {INSTRUMENTS.map((i) => (
        <button
          key={i.id}
          role="radio"
          aria-checked={value === i.id}
          class={`seg-btn${value === i.id ? ' on' : ''}`}
          onClick={() => onChange(i.id)}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** All the chords in the song, as diagrams for the chosen instrument. Opened from the row under the song title. */
export function ChordBody({
  chords,
  instrument,
  onInstrument,
  onOpen,
}: {
  chords: string[];
  instrument: Instrument;
  onInstrument: (i: Instrument) => void;
  onOpen: (text: string) => void;
}) {
  const w = instrument === 'piano' ? 132 : 68;
  return (
    <section class="cpanel" aria-label="Chords in this song">
      <div class="cpanel-head">
        <InstrumentSwitch value={instrument} onChange={onInstrument} />
      </div>
      <div class="cpanel-row" data-noswipe>
        {chords.map((c) => (
          <button key={c} class="ccard" onClick={() => onOpen(c)} aria-label={`Show how to play ${c}`}>
            <span class="ccard-name">{c}</span>
            <ChordDiagram text={c} instrument={instrument} width={w} />
          </button>
        ))}
      </div>
    </section>
  );
}
