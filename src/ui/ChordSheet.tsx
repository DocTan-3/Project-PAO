import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Instrument } from '../instruments';
import { pianoVoicings } from '../instruments';
import { parseChord } from '../theory';
import { Icon } from './icons';
import { InstrumentSwitch } from './ChordPanel';
import { ChordDiagram, chordNoteNames, shapeCount } from './ChordView';

/** Detail view of one chord: big diagram, its notes, and alternative shapes. */
export function ChordSheet({
  text,
  instrument,
  onInstrument,
  onClose,
}: {
  text: string;
  instrument: Instrument;
  onInstrument: (i: Instrument) => void;
  onClose: () => void;
}) {
  const chord = useMemo(() => parseChord(text), [text]);
  const total = shapeCount(chord, instrument);
  const [shape, setShape] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setShape(0), [text, instrument]);
  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && total > 1) setShape((s) => (s + 1) % total);
      else if (e.key === 'ArrowLeft' && total > 1) setShape((s) => (s - 1 + total) % total);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [total, onClose]);

  const names = chord ? chordNoteNames(chord) : [];
  const caption =
    instrument === 'piano' && chord
      ? (pianoVoicings(chord)[shape]?.label ?? '')
      : total > 0
        ? shape === 0
          ? 'Most common shape'
          : `Alternative shape`
        : '';

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`How to play ${text}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="sheet-head">
          <h2>{text}</h2>
          <button class="btn icon" ref={closeRef} onClick={onClose} aria-label="Close chord view"><Icon name="close" /></button>
        </div>
        {names.length > 0 && (
          <p class="sheet-notes">
            Notes <b>{names.join(' · ')}</b>
          </p>
        )}
        <div class="sheet-diagram">
          <ChordDiagram text={text} instrument={instrument} shape={shape} width={instrument === 'piano' ? 320 : 200} />
        </div>
        {total > 1 && (
          <div class="sheet-nav">
            <button class="btn icon" onClick={() => setShape((s) => (s - 1 + total) % total)} aria-label="Previous shape"><Icon name="back" /></button>
            <span>
              {caption} <small class="muted">({shape + 1} of {total})</small>
            </span>
            <button class="btn icon" onClick={() => setShape((s) => (s + 1) % total)} aria-label="Next shape"><Icon name="next" /></button>
          </div>
        )}
        {total === 0 && <p class="muted center-text">No diagram for this chord yet.</p>}
        <InstrumentSwitch value={instrument} onChange={onInstrument} />
      </div>
    </div>
  );
}
