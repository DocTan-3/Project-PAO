import { useMemo, useRef } from 'preact/hooks';
import { indexAtX } from '../layout/indexAtX';
import { addChord, moveChord, setLyrics } from '../model/edit';
import type { Line } from '../model/types';
import { parseChord } from '../theory';
import { FONT_FAMILY } from './font';
import { makeMeasure } from './measure';

const PAD = 12; // left padding of the lyric input, in px
const CHIP_H = 30;
const CHIP_PAD = 14; // horizontal chip padding total

export interface LineEditorProps {
  line: Line;
  fontPx: number;
  fontsReady: boolean;
  selectedId: string | null;
  /** chord text used when the user taps the strip to place a new chord */
  defaultChord: string;
  onSelect: (chordId: string | null) => void;
  onChange: (line: Line, coalesceKey?: string) => void;
  onEnter: (caret: number) => void;
  onBackspaceAtStart: () => void;
  onRemoveLine: () => void;
  registerInput: (el: HTMLInputElement | null) => void;
}

interface Chip {
  id: string;
  text: string;
  x: number;
  w: number;
  level: number;
  at: number;
}

export function LineEditor(p: LineEditorProps) {
  const { line, fontPx } = p;
  const chordPx = Math.round(fontPx * 0.85);
  const measure = useMemo(() => makeMeasure(`400 ${fontPx}px ${FONT_FAMILY}`), [fontPx, p.fontsReady]);
  const measureChord = useMemo(() => makeMeasure(`700 ${chordPx}px ${FONT_FAMILY}`), [chordPx, p.fontsReady]);
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startX: number; moved: boolean } | null>(null);
  const chordOnlyLine = line.lyrics.length === 0;

  // Position every chip. Chord-only lines lay chips out in order; otherwise each sits at its anchor,
  // and overlapping chips are stacked onto extra levels so none is hidden.
  const { chips, levels } = useMemo(() => {
    const out: Chip[] = [];
    const ends: number[] = [];
    let seqX = 0;
    const ordered = line.chords
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (chordOnlyLine ? a.i - b.i : a.c.at - b.c.at || a.i - b.i));
    for (const { c } of ordered) {
      const w = measureChord(c.text || '?') + CHIP_PAD;
      const x = chordOnlyLine ? seqX : PAD + measure(line.lyrics.slice(0, c.at));
      let level = ends.findIndex((end) => x >= end);
      if (chordOnlyLine || level < 0) level = chordOnlyLine ? 0 : ends.length;
      ends[level] = x + w + 2;
      if (chordOnlyLine) seqX = x + w + 6;
      out.push({ id: c.id, text: c.text, x, w, level, at: c.at });
    }
    return { chips: out, levels: Math.max(1, ends.length) };
  }, [line.chords, line.lyrics, measure, measureChord, chordOnlyLine]);

  const textW = measure(line.lyrics);
  const seqW = chips.reduce((m, c) => Math.max(m, c.x + c.w), 0);
  const innerW = Math.max(textW, seqW) + PAD * 2 + 80;

  const xFromPointer = (clientX: number) => {
    const rect = stripRef.current!.getBoundingClientRect();
    return clientX - rect.left - PAD;
  };

  const placeChord = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.echip')) return;
    const at = chordOnlyLine ? 0 : indexAtX(line.lyrics, xFromPointer(e.clientX), measure);
    const { line: next, id } = addChord(line, at, p.defaultChord);
    p.onChange(next);
    p.onSelect(id);
  };

  const onChipDown = (e: PointerEvent, id: string) => {
    e.stopPropagation();
    p.onSelect(id);
    if (chordOnlyLine) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, startX: e.clientX, moved: false };
  };
  const onChipMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < 4) return;
    d.moved = true;
    const at = indexAtX(line.lyrics, xFromPointer(e.clientX), measure);
    const cur = line.chords.find((c) => c.id === d.id);
    if (cur && cur.at !== at) p.onChange(moveChord(line, d.id, at), `drag-${d.id}`);
  };
  const onChipUp = () => {
    drag.current = null;
  };

  const sel = chips.find((c) => c.id === p.selectedId);
  const stripH = levels * CHIP_H + 4;

  return (
    <div class="le" data-line={line.id}>
      <div class="le-scroll">
        <div class="le-inner" style={{ width: `${innerW}px` }}>
          <div
            class="le-strip"
            ref={stripRef}
            style={{ height: `${stripH}px`, fontSize: `${chordPx}px` }}
            onClick={placeChord}
            role="group"
            aria-label="Chords"
            title="Tap to place a chord"
          >
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                class={`echip${c.id === p.selectedId ? ' sel' : ''}${c.text && !parseChord(c.text) ? ' odd' : ''}`}
                style={{ left: `${c.x}px`, top: `${c.level * CHIP_H + 2}px`, height: `${CHIP_H - 4}px` }}
                onPointerDown={(e) => onChipDown(e, c.id)}
                onPointerMove={onChipMove}
                onPointerUp={onChipUp}
                onPointerCancel={onChipUp}
              >
                {c.text || '?'}
              </button>
            ))}
            {sel && !chordOnlyLine && (
              <span class="le-guide" style={{ left: `${sel.x}px`, top: `${stripH - 2}px` }} />
            )}
          </div>
          <input
            class="le-input"
            ref={(el) => p.registerInput(el)}
            style={{ fontSize: `${fontPx}px` }}
            value={line.lyrics}
            placeholder={line.chords.length ? '' : 'Lyrics…'}
            autocomplete="off"
            autocapitalize="sentences"
            spellcheck={false}
            enterkeyhint="next"
            onInput={(e) => p.onChange(setLyrics(line, (e.currentTarget as HTMLInputElement).value), `lyrics-${line.id}`)}
            onKeyDown={(e) => {
              const el = e.currentTarget as HTMLInputElement;
              if (e.key === 'Enter') {
                e.preventDefault();
                p.onEnter(el.selectionStart ?? el.value.length);
              } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
                e.preventDefault();
                p.onBackspaceAtStart();
              }
            }}
          />
        </div>
      </div>
      <button type="button" class="le-del" onClick={p.onRemoveLine} aria-label="Delete line" title="Delete line">
        ×
      </button>
    </div>
  );
}
