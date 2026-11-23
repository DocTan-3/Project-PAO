import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  addLineToSection,
  addSection,
  mapLine,
  mergeUp,
  moveChord,
  removeChord,
  removeLine,
  removeSection,
  reorderChord,
  setChordText,
  setMeta,
  setSectionLabel,
  splitAt,
  wordStep,
} from '../model/edit';
import type { SongStore } from '../model/store';
import type { Line, Song } from '../model/types';
import { applyTranspose, songKeyOf } from '../model/view';
import { formatNote, parseChord } from '../theory';
import { ChordToolbar } from './ChordToolbar';
import { loadFontPx, saveFontPx, useFontsReady } from './font';
import { LineEditor } from './LineEditor';

const KEYS = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
];
const SECTION_NAMES = ['Verse', 'Chorus', 'Bridge', 'Intro', 'Outro'];

export type ExitTarget = 'library' | 'preview';

function isBlank(song: Song): boolean {
  return !song.title.trim() && song.sections.every((s) => s.lines.every((l) => !l.lyrics && l.chords.length === 0));
}

export function Editor({
  initial,
  store,
  onExit,
}: {
  initial: Song;
  store: SongStore;
  onExit: (to: ExitTarget, savedId: string | null) => void;
}) {
  const [song, setSong] = useState<Song>(initial);
  const songRef = useRef(song);
  songRef.current = song;
  const past = useRef<Song[]>([]);
  const lastCommit = useRef<{ key: string; t: number }>({ key: '', t: 0 });
  const [canUndo, setCanUndo] = useState(false);
  const [status, setStatus] = useState<'saved' | 'saving'>('saved');
  const [sel, setSel] = useState<{ lineId: string; chordId: string } | null>(null);
  const [lastChord, setLastChord] = useState<string | null>(null);
  const [fontPx, setFontPx] = useState(loadFontPx);
  const fontsReady = useFontsReady();
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<{ id: string; caret: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveFontPx(fontPx), [fontPx]);

  const commit = useCallback((next: Song, key = '') => {
    const now = Date.now();
    const same = key && lastCommit.current.key === key && now - lastCommit.current.t < 1000;
    if (!same) {
      past.current.push(songRef.current);
      if (past.current.length > 100) past.current.shift();
    }
    lastCommit.current = { key, t: now };
    songRef.current = next;
    setSong(next);
    setCanUndo(true);
    setStatus('saving');
  }, []);

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    lastCommit.current = { key: '', t: 0 };
    songRef.current = prev;
    setSong(prev);
    setCanUndo(past.current.length > 0);
    setStatus('saving');
    setSel(null);
  };

  // autosave (debounced) and flush when the tab is hidden
  useEffect(() => {
    if (status !== 'saving') return;
    const t = setTimeout(() => {
      store.put(songRef.current).then(() => setStatus('saved'));
    }, 500);
    return () => clearTimeout(t);
  }, [song, status, store]);
  useEffect(() => {
    const flush = () => void store.put(songRef.current);
    addEventListener('pagehide', flush);
    return () => removeEventListener('pagehide', flush);
  }, [store]);

  const exit = async (to: ExitTarget) => {
    const s = songRef.current;
    if (isBlank(s)) {
      await store.delete(s.id);
      onExit('library', null);
      return;
    }
    await store.put(s);
    onExit(to, s.id);
  };

  // focus a line input right after a split/merge re-render (layout effect: before the next keystroke)
  useLayoutEffect(() => {
    const f = pendingFocus.current;
    if (!f) return;
    const el = inputs.current.get(f.id);
    if (el) {
      el.focus();
      el.setSelectionRange(f.caret, f.caret);
      pendingFocus.current = null;
    }
  });

  const songKey = songKeyOf(song);
  const defaultChord = useMemo(() => {
    if (lastChord) return lastChord;
    return songKey ? formatNote(songKey.tonic) + (songKey.mode === 'minor' ? 'm' : '') : 'C';
  }, [lastChord, song.key]);

  const find = (lineId: string): Line | undefined =>
    song.sections.flatMap((s) => s.lines).find((l) => l.id === lineId);
  const selLine = sel ? find(sel.lineId) : undefined;
  const selChord = selLine?.chords.find((c) => c.id === sel?.chordId);

  // keep the line being edited visible above the chord toolbar
  useEffect(() => {
    if (!sel) return;
    const el = document.querySelector(`[data-line="${sel.lineId}"]`);
    const tb = toolbarRef.current;
    if (!el || !tb) return;
    const limit = window.innerHeight - tb.offsetHeight - 12;
    const r = el.getBoundingClientRect();
    if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit, behavior: 'smooth' });
  }, [sel?.lineId, sel?.chordId]);

  const onText = (text: string) => {
    if (!sel) return;
    commit(mapLine(song, sel.lineId, (l) => setChordText(l, sel.chordId, text)), `ctext-${sel.chordId}`);
    if (parseChord(text)) setLastChord(text);
  };
  const onNudge = (delta: number, unit: 'char' | 'word') => {
    if (!sel || !selLine || !selChord) return;
    if (selLine.lyrics.length === 0) {
      commit(mapLine(song, sel.lineId, (l) => reorderChord(l, sel.chordId, delta as 1 | -1)));
      return;
    }
    const at = unit === 'word' ? wordStep(selLine.lyrics, selChord.at, delta as 1 | -1) : selChord.at + delta;
    commit(mapLine(song, sel.lineId, (l) => moveChord(l, sel.chordId, at)), `nudge-${sel.chordId}`);
  };
  const onDelete = () => {
    if (!sel) return;
    commit(mapLine(song, sel.lineId, (l) => removeChord(l, sel.chordId)));
    setSel(null);
  };

  const verses = (label: string) => song.sections.filter((s) => s.label.startsWith(label)).length;
  const addNamedSection = (base: string) => {
    const n = verses(base);
    commit(addSection(song, n === 0 && base !== 'Verse' ? base : `${base} ${n + 1}`));
  };

  return (
    <div class={`editor${sel ? ' has-toolbar' : ''}`}>
      <header class="bar ed-bar">
        <button class="btn" onClick={() => exit('library')} aria-label="Save and go back">‹</button>
        <span class="status" aria-live="polite">{status === 'saving' ? 'Saving…' : 'Saved'}</span>
        <span class="grow" />
        <button class="btn" onClick={undo} disabled={!canUndo} aria-label="Undo">Undo</button>
        <button class="btn primary" onClick={() => exit('preview')}>Preview</button>
      </header>

      <section class="meta">
        <input
          id="song-title"
          class="meta-title"
          placeholder="Song title"
          value={song.title}
          onInput={(e) => commit(setMeta(song, { title: (e.currentTarget as HTMLInputElement).value }), 'title')}
        />
        <input
          id="song-artist"
          class="meta-artist"
          placeholder="Artist"
          value={song.artist}
          onInput={(e) => commit(setMeta(song, { artist: (e.currentTarget as HTMLInputElement).value }), 'artist')}
        />
        <div class="meta-row">
          <label class="ctl">
            <span>Key</span>
            <select
              id="song-key"
              value={song.key ?? ''}
              onChange={(e) => commit(setMeta(song, { key: (e.currentTarget as HTMLSelectElement).value || null }))}
            >
              <option value="">Not set</option>
              {KEYS.map((k) => (
                <option value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label class="ctl">
            <span>Tempo (BPM)</span>
            <input
              id="song-bpm"
              type="number"
              inputMode="numeric"
              min={30}
              max={300}
              placeholder="—"
              value={song.bpm ?? ''}
              onInput={(e) => {
                const n = parseInt((e.currentTarget as HTMLInputElement).value, 10);
                commit(setMeta(song, { bpm: Number.isFinite(n) ? n : null }), 'bpm');
              }}
            />
          </label>
          <div class="ctl">
            <span>Shift all chords</span>
            <div class="stepper">
              <button class="btn" onClick={() => commit(applyTranspose(song, -1))} aria-label="Shift all chords down a semitone">−1</button>
              <button class="btn" onClick={() => commit(applyTranspose(song, 1))} aria-label="Shift all chords up a semitone">+1</button>
            </div>
          </div>
          <div class="ctl">
            <span>Text size</span>
            <div class="stepper">
              <button class="btn" onClick={() => setFontPx((f) => Math.max(12, f - 2))} aria-label="Smaller text">A−</button>
              <button class="btn" onClick={() => setFontPx((f) => Math.min(34, f + 2))} aria-label="Larger text">A+</button>
            </div>
          </div>
        </div>
        <p class="hint">
          Tap above a lyric to place a chord. Drag a chord to line it up, or use the arrows below.
        </p>
      </section>

      {song.sections.map((sec) => (
        <section class="ed-section" key={sec.id}>
          <div class="sec-head">
            <input
              class="sec-label"
              aria-label="Section name"
              placeholder="Section name"
              value={sec.label}
              onInput={(e) => commit(setSectionLabel(song, sec.id, (e.currentTarget as HTMLInputElement).value), `sec-${sec.id}`)}
            />
            <button class="btn sm" onClick={() => commit(removeSection(song, sec.id))} aria-label={`Remove section ${sec.label}`}>
              Remove
            </button>
          </div>
          {sec.lines.map((line) => (
            <LineEditor
              key={line.id}
              line={line}
              fontPx={fontPx}
              fontsReady={fontsReady}
              selectedId={sel?.lineId === line.id ? sel.chordId : null}
              defaultChord={defaultChord}
              onSelect={(id) => setSel(id ? { lineId: line.id, chordId: id } : null)}
              onChange={(l, key) => commit(mapLine(song, line.id, () => l), key)}
              onEnter={(caret) => {
                const r = splitAt(song, line.id, caret);
                if (!r) return;
                commit(r.song);
                pendingFocus.current = { id: r.newLineId, caret: 0 };
              }}
              onBackspaceAtStart={() => {
                const r = mergeUp(song, line.id);
                if (!r) return;
                commit(r.song);
                pendingFocus.current = { id: r.prevId, caret: r.caret };
              }}
              onRemoveLine={() => {
                commit(removeLine(song, line.id));
                if (sel?.lineId === line.id) setSel(null);
              }}
              registerInput={(el) => {
                if (el) inputs.current.set(line.id, el);
                else inputs.current.delete(line.id);
              }}
            />
          ))}
          <button
            class="btn sm add-line"
            onClick={() => {
              const r = addLineToSection(song, sec.id);
              commit(r.song);
              pendingFocus.current = { id: r.lineId, caret: 0 };
            }}
          >
            + Add line
          </button>
        </section>
      ))}

      <div class="add-sections" aria-label="Add section">
        <span class="muted">Add section</span>
        {SECTION_NAMES.map((n) => (
          <button class="chipbtn flat" onClick={() => addNamedSection(n)}>
            {n}
          </button>
        ))}
      </div>

      {sel && selChord && (
        <div class="ctb-wrap" ref={toolbarRef}>
          <ChordToolbar
            text={selChord.text}
            songKey={songKey}
            isChordOnly={!!selLine && selLine.lyrics.length === 0}
            onText={onText}
            onNudge={onNudge}
            onDelete={onDelete}
            onClose={() => setSel(null)}
          />
        </div>
      )}
    </div>
  );
}
