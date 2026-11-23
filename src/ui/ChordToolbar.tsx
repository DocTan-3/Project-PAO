import { useMemo, useState } from 'preact/hooks';
import { Icon } from './icons';
import {
  type Key,
  diatonicChords,
  formatChord,
  formatNote,
  parseChord,
  spellInKey,
  spellPitchClass,
} from '../theory';

const BEAT_CHOICES: (number | undefined)[] = [undefined, 1, 2, 3, 4, 6, 8, 12, 16];

const SUFFIXES: [label: string, suffix: string][] = [
  ['maj', ''], ['m', 'm'], ['7', '7'], ['maj7', 'maj7'], ['m7', 'm7'], ['sus4', 'sus4'],
  ['sus2', 'sus2'], ['dim', 'dim'], ['aug', 'aug'], ['6', '6'], ['9', '9'], ['add9', 'add9'],
];

export interface ChordToolbarProps {
  text: string;
  songKey: Key | null;
  isChordOnly: boolean;
  /** 'place': choosing where a new chord goes (Add/Cancel); 'edit': changing an existing chord */
  mode: 'place' | 'edit';
  onConfirm: () => void;
  /** how long the selected chord lasts; undefined = follow the song's default */
  beats?: number;
  onBeats?: (beats: number | undefined) => void;
  onText: (text: string) => void;
  onNudge: (delta: number, unit: 'char' | 'word') => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ChordToolbar(p: ChordToolbarProps) {
  const parsed = parseChord(p.text);
  // one extra panel at a time, so the toolbar stays short on a phone
  const [panel, setPanel] = useState<'beats' | 'more' | null>(null);
  const toggle = (name: 'beats' | 'more') => setPanel((cur) => (cur === name ? null : name));
  const diatonic = useMemo(() => (p.songKey ? diatonicChords(p.songKey) : []), [p.songKey && JSON.stringify(p.songKey)]);
  const roots = useMemo(
    () =>
      Array.from({ length: 12 }, (_, pc) =>
        formatNote(p.songKey ? spellInKey(pc, p.songKey) : spellPitchClass(pc, 'sharps')),
      ),
    [p.songKey && JSON.stringify(p.songKey)],
  );

  const setRoot = (root: string) => {
    if (parsed) p.onText(root + parsed.suffix + (parsed.bass ? '/' + formatNote(parsed.bass) : ''));
    else p.onText(root);
  };
  const setSuffix = (suffix: string) => {
    if (parsed) p.onText(formatChord({ ...parsed, suffix }));
  };

  return (
    <div class="ctb" role="toolbar" aria-label="Chord editor">
      <div class="ctb-row between">
        <div class="stepper" aria-label="Move chord">
          <button class="btn sm" onClick={() => p.onNudge(-1, 'word')} aria-label="Previous word" title={p.isChordOnly ? 'Move earlier' : 'Previous word'}>⇤</button>
          <button class="btn sm" onClick={() => p.onNudge(-1, 'char')} aria-label="One character left" title={p.isChordOnly ? 'Move earlier' : 'One character left'}>◀</button>
          <button class="btn sm" onClick={() => p.onNudge(1, 'char')} aria-label="One character right" title={p.isChordOnly ? 'Move later' : 'One character right'}>▶</button>
          <button class="btn sm" onClick={() => p.onNudge(1, 'word')} aria-label="Next word" title={p.isChordOnly ? 'Move later' : 'Next word'}>⇥</button>
        </div>
        {p.mode === 'place' ? (
          <div class="stepper">
            <button class="btn sm" onClick={p.onClose} aria-label="Cancel, do not add a chord">Cancel</button>
            <button class="btn sm primary" onClick={p.onConfirm} aria-label="Add this chord">Add</button>
          </div>
        ) : (
          <div class="stepper">
            <button class="btn sm danger" onClick={p.onDelete} aria-label="Delete chord">Delete</button>
            <button class="btn sm" onClick={p.onClose} aria-label="Deselect chord">Done</button>
          </div>
        )}
      </div>
      <div class="ctb-row">
        <input
          id="chord-text"
          class={`ctb-text${p.text && !parsed ? ' odd' : ''}`}
          value={p.text}
          aria-label="Chord name"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          onInput={(e) => p.onText((e.currentTarget as HTMLInputElement).value.trim())}
        />
        {p.mode === 'edit' && p.onBeats && (
          <button
            class={`btn sm beats-btn${panel === 'beats' ? ' open' : ''}`}
            onClick={() => toggle('beats')}
            aria-expanded={panel === 'beats'}
            aria-label={`Beats this chord lasts: ${p.beats ?? 'Auto'}`}
            title="How long this chord lasts"
          >
            <Icon name="timer" size={18} />
            {p.beats ?? 'Auto'}
          </button>
        )}
        <button class="btn sm" onClick={() => toggle('more')} aria-expanded={panel === 'more'}>
          {panel === 'more' ? 'Less' : 'More'}
        </button>
      </div>
      {diatonic.length > 0 && (
        <div class="ctb-scroll" aria-label="Chords in this key">
          {diatonic.map((d) => (
            <button class="chipbtn" onClick={() => p.onText(formatChord(d.chord))}>
              {formatChord(d.chord)}
              <small>{d.numeral}</small>
            </button>
          ))}
        </div>
      )}
      {panel === 'beats' && p.mode === 'edit' && p.onBeats && (
        <div class="ctb-scroll" role="radiogroup" aria-label="How long this chord lasts, in beats">
          {BEAT_CHOICES.map((b) => (
            <button
              key={b ?? 'auto'}
              role="radio"
              aria-checked={p.beats === b}
              class={`chipbtn flat${p.beats === b ? ' on' : ''}`}
              onClick={() => p.onBeats?.(b)}
              title={b === undefined ? 'Follow the default length' : `${b} ${b === 1 ? 'beat' : 'beats'}`}
            >
              {b === undefined ? 'Auto' : b}
            </button>
          ))}
        </div>
      )}
      {panel === 'more' && (
        <>
          <div class="ctb-scroll" aria-label="Root note">
            {roots.map((r) => (
              <button class={`chipbtn flat${parsed && formatNote(parsed.root) === r ? ' on' : ''}`} onClick={() => setRoot(r)}>{r}</button>
            ))}
          </div>
          <div class="ctb-scroll" aria-label="Chord quality">
            {SUFFIXES.map(([label, s]) => (
              <button class={`chipbtn flat${parsed && parsed.suffix === s ? ' on' : ''}`} onClick={() => setSuffix(s)}>{label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
