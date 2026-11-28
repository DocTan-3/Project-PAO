import { useState } from 'preact/hooks';
import type { Instrument } from '../instruments';
import { ChordDiagram, INSTRUMENTS } from './ChordView';
import { Icon } from './icons';

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

/** All the chords in the song, as diagrams for the chosen instrument. */
export function ChordPanel({
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
  // closed every time a song opens
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  if (chords.length === 0) return null;
  const w = instrument === 'piano' ? 132 : 68;
  return (
    <section class="cpanel" aria-label="Chords in this song">
      <div class="cpanel-head">
        <button class="cpanel-toggle" onClick={toggle} aria-expanded={open}>
          <span class={`caret${open ? ' open' : ''}`} aria-hidden="true"><Icon name="next" size={16} /></span>
          Chords <span class="muted">({chords.length})</span>
        </button>
        {open && <InstrumentSwitch value={instrument} onChange={onInstrument} />}
      </div>
      {open && (
        <div class="cpanel-row" data-noswipe>
          {chords.map((c) => (
            <button key={c} class="ccard" onClick={() => onOpen(c)} aria-label={`Show how to play ${c}`}>
              <span class="ccard-name">{c}</span>
              <ChordDiagram text={c} instrument={instrument} width={w} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
