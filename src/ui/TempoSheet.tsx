import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_BPM, MIN_BPM, clampBpm } from '../model/tapTempo';
import { Icon } from './icons';
import { TapButton } from './TapButton';

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const BEATS = [1, 2, 4, 8];

function Seg<T extends number>({ label, value, options, fmt, onChange }: { label: string; value: T; options: T[]; fmt: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div class="tempo-field">
      <span class="ctl-label on">{label}</span>
      <div class="seg wide" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} role="radio" aria-checked={value === o} class={`seg-btn${value === o ? ' on' : ''}`} onClick={() => onChange(o)}>
            {fmt(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tempo, tap tempo, how long each chord lasts, and scroll speed. */
export function TempoSheet(p: {
  bpm: number;
  onBpm: (n: number) => void;
  beats: number;
  onBeats: (n: number) => void;
  speed: number;
  onSpeed: (n: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(p.bpm));
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(String(p.bpm));
  }, [p.bpm]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose();
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [p.onClose]);

  const commit = () => {
    editing.current = false;
    const n = parseInt(draft, 10);
    const next = Number.isFinite(n) ? clampBpm(n) : p.bpm;
    setDraft(String(next)); // always show the value that was actually used
    if (next !== p.bpm) p.onBpm(next);
  };
  const nudge = (d: number) => p.onBpm(clampBpm(p.bpm + d));
  const secondsPerChord = ((p.beats * 60) / (p.bpm * p.speed)).toFixed(1);

  return (
    <div class="sheet-backdrop" onClick={p.onClose}>
      <div class="sheet tempo" role="dialog" aria-modal="true" aria-label="Tempo and scrolling" onClick={(e) => e.stopPropagation()}>
        <div class="sheet-head">
          <h2 class="plain">Tempo</h2>
          <button class="btn icon" onClick={p.onClose} aria-label="Close tempo"><Icon name="close" /></button>
        </div>

        <div class="bpm-row">
          <button class="btn icon" onClick={() => nudge(-1)} aria-label="Slower by one">
            <Icon name="minus" />
          </button>
          <label class="bpm-field">
            <input
              id="bpm-input"
              type="number"
              inputMode="numeric"
              min={MIN_BPM}
              max={MAX_BPM}
              value={draft}
              aria-label="Beats per minute"
              onFocus={() => (editing.current = true)}
              onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
            <span>BPM</span>
          </label>
          <button class="btn icon" onClick={() => nudge(1)} aria-label="Faster by one">
            <Icon name="plus" />
          </button>
        </div>

        <TapButton big onBpm={p.onBpm} />

        <Seg label="Beats per chord" value={p.beats} options={BEATS} fmt={(n) => String(n)} onChange={p.onBeats} />
        <Seg label="Scroll speed" value={p.speed} options={SPEEDS} fmt={(n) => `${n}×`} onChange={p.onSpeed} />

        <p class="muted center-text small">
          Chords last {p.beats} {p.beats === 1 ? 'beat' : 'beats'} (about {secondsPerChord}s at this tempo) unless you set a
          length for that chord in the editor. The page scrolls to keep time.
        </p>
      </div>
    </div>
  );
}
