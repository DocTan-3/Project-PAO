import { useMemo, useState } from 'preact/hooks';
import { parseChord } from '../theory';
import type { Instrument } from '../instruments';
import { ChordSheet } from './ChordSheet';
import { InstrumentSwitch } from './ChordPanel';
import { ChordDiagram, loadInstrument, saveInstrument, shapeCount } from './ChordView';
import { Icon } from './icons';
import { ThemeToggle } from './theme';
import { VERSES, Verse } from './verses';

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Chord kinds shown for every root, in the order a player looks for them. */
const KINDS: { suffix: string; label: string }[] = [
  { suffix: '', label: 'Major' },
  { suffix: 'm', label: 'Minor' },
  { suffix: '7', label: 'Dominant 7' },
  { suffix: 'maj7', label: 'Major 7' },
  { suffix: 'm7', label: 'Minor 7' },
  { suffix: 'sus2', label: 'Sus 2' },
  { suffix: 'sus4', label: 'Sus 4' },
  { suffix: '6', label: '6' },
  { suffix: 'm6', label: 'Minor 6' },
  { suffix: '9', label: '9' },
  { suffix: 'add9', label: 'Add 9' },
  { suffix: 'dim', label: 'Diminished' },
  { suffix: 'dim7', label: 'Diminished 7' },
  { suffix: 'm7b5', label: 'Half-diminished' },
  { suffix: 'aug', label: 'Augmented' },
];

const ROOT_KEY = 'pao:chordroot';
function loadRoot(): string {
  try {
    const v = localStorage.getItem(ROOT_KEY);
    if (v && ROOTS.includes(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return 'C';
}

/** Every chord on guitar, ukulele or piano: pick the instrument, pick a root, see all its chords. */
export function ChordsPage({ onMenu }: { onMenu: () => void }) {
  const [instrument, setInstrumentState] = useState<Instrument>(loadInstrument);
  const [root, setRootState] = useState(loadRoot);
  const [open, setOpen] = useState<string | null>(null);

  const setInstrument = (i: Instrument) => {
    setInstrumentState(i);
    saveInstrument(i);
  };
  const setRoot = (r: string) => {
    setRootState(r);
    try {
      localStorage.setItem(ROOT_KEY, r);
    } catch {
      /* ignore */
    }
  };

  const chords = useMemo(
    () =>
      KINDS.map((k) => ({ ...k, text: `${root}${k.suffix}` })).filter((c) => {
        const parsed = parseChord(c.text);
        return parsed && shapeCount(parsed, instrument) > 0;
      }),
    [root, instrument],
  );
  const w = instrument === 'piano' ? 150 : 84;

  return (
    <main class="library chords-page">
      <div class="lib-pinned page-pinned">
        <div class="lib-top">
          <div class="brand">
            <button class="btn icon ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
            Chords
          </div>
          <ThemeToggle />
        </div>
        <div class="chords-controls">
          <InstrumentSwitch value={instrument} onChange={setInstrument} />
          <div class="root-grid" role="radiogroup" aria-label="Root note">
            {ROOTS.map((r) => (
              <button
                key={r}
                role="radio"
                aria-checked={root === r}
                class={`root-btn${root === r ? ' on' : ''}`}
                onClick={() => setRoot(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul class={`chord-grid${instrument === 'piano' ? ' piano' : ''}`} aria-label={`${root} chords`}>
        {chords.map((c) => (
          <li key={c.text}>
            <button class="ccard big" onClick={() => setOpen(c.text)} aria-label={`Show how to play ${c.text}`}>
              <span class="ccard-name">{c.text}</span>
              <span class="ccard-kind">{c.label}</span>
              <ChordDiagram text={c.text} instrument={instrument} width={w} />
            </button>
          </li>
        ))}
      </ul>
      <Verse id="chords-verse" text={VERSES.chords} />

      {open && <ChordSheet text={open} instrument={instrument} onInstrument={setInstrument} onClose={() => setOpen(null)} />}
    </main>
  );
}
