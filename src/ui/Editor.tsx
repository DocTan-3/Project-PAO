import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  addChord,
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
import { webUrl } from '../model/url';
import type { Line, Song } from '../model/types';
import { LANGUAGES, languageOf } from '../model/library';
import { applyTranspose, songKeyOf } from '../model/view';
import { formatNote, parseChord } from '../theory';
import { ChordToolbar } from './ChordToolbar';
import { loadFontPx, saveFontPx, useFontsReady } from './font';
import { Icon } from './icons';
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
  // a chord being placed: a tap picks the spot, "Add chord" confirms it
  const [pending, setPending] = useState<{ lineId: string; at: number } | null>(null);
  const [pendingText, setPendingText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fontPx, setFontPx] = useState(loadFontPx);
  const fontsReady = useFontsReady();
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<{ id: string; caret: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveFontPx(fontPx), [fontPx]);
  // Escape (and the Android back button) puts the chord toolbar away
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSel(null);
      setPending(null);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);

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
  const focusLineId = sel?.lineId ?? pending?.lineId ?? null;
  useEffect(() => {
    if (!focusLineId) return;
    const el = document.querySelector(`[data-line="${focusLineId}"]`);
    const tb = toolbarRef.current;
    if (!el || !tb) return;
    const limit = window.innerHeight - tb.offsetHeight - 12;
    const r = el.getBoundingClientRect();
    if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit, behavior: 'smooth' });
  }, [focusLineId, sel?.chordId, pending?.at]);

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

  // ---- placing a new chord: tap = move marker, "Add chord" = commit ----
  const pendingLine = pending ? find(pending.lineId) : undefined;
  const tapStrip = (lineId: string, at: number) => {
    if (!pending) setPendingText(defaultChord);
    setSel(null);
    setPending({ lineId, at });
  };
  const confirmPending = () => {
    if (!pending || !pendingLine) return;
    const text = pendingText.trim() || defaultChord;
    const r = addChord(pendingLine, pending.at, text);
    commit(mapLine(song, pending.lineId, () => r.line));
    if (parseChord(text)) setLastChord(text);
    setSel({ lineId: pending.lineId, chordId: r.id });
    setPending(null);
  };
  const nudgePending = (delta: number, unit: 'char' | 'word') => {
    if (!pending || !pendingLine || pendingLine.lyrics.length === 0) return;
    const at = unit === 'word' ? wordStep(pendingLine.lyrics, pending.at, delta as 1 | -1) : pending.at + delta;
    setPending({ ...pending, at: Math.max(0, Math.min(pendingLine.lyrics.length, at)) });
  };

  const deleteSong = async () => {
    await store.delete(songRef.current.id);
    onExit('library', null);
  };

  const verses = (label: string) => song.sections.filter((s) => s.label.startsWith(label)).length;
  const addNamedSection = (base: string) => {
    const n = verses(base);
    commit(addSection(song, n === 0 && base !== 'Verse' ? base : `${base} ${n + 1}`));
  };

  return (
    <div class={`editor${sel || pending ? ' has-toolbar' : ''}`}>
      <header class="ed-bar">
        <button class="btn icon ghost" onClick={() => exit('library')} aria-label="Save and go back"><Icon name="back" /></button>
        <span class={`status${status === 'saving' ? ' saving' : ''}`} aria-live="polite">{status === 'saving' ? 'Saving…' : 'Saved'}</span>
        <span class="grow" />
        <button class="btn" onClick={undo} disabled={!canUndo} aria-label="Undo"><Icon name="undo" size={20} />Undo</button>
        <button class="btn primary" onClick={() => exit('preview')}><Icon name="eye" size={20} />Preview</button>
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
        <label class="ctl lang-ctl">
          <span class="ctl-label">Language</span>
          <select
            id="song-language"
            value={languageOf(song)}
            onChange={(e) => commit(setMeta(song, { language: (e.currentTarget as HTMLSelectElement).value as 'en' | 'tl' }))}
          >
            {LANGUAGES.map((l) => (
              <option value={l.id}>{l.label}</option>
            ))}
          </select>
        </label>
        <label class="notes-field">
          <span class="lbl">Notes for other players</span>
          <textarea
            id="song-notes"
            rows={3}
            placeholder="Tuning, strumming, who plays what, how to count in…"
            value={song.notes ?? ''}
            onInput={(e) => commit(setMeta(song, { notes: (e.currentTarget as HTMLTextAreaElement).value }), 'notes')}
          />
        </label>
        <label class="notes-field">
          <span class="lbl">Reference video link (optional)</span>
          <input
            id="song-video"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellcheck={false}
            placeholder="Paste a YouTube or other web link"
            value={song.videoUrl ?? ''}
            onInput={(e) => {
              const v = (e.currentTarget as HTMLInputElement).value.trim();
              commit(setMeta(song, { videoUrl: v || undefined }), 'video');
            }}
          />
          {song.videoUrl && !webUrl(song.videoUrl) && <span class="field-hint bad" id="video-hint">That does not look like a web link.</span>}
        </label>
        <div class="meta-row">
          <label class="ctl">
            <span class="ctl-label">Key</span>
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
          <div class="ctl">
            <span class="ctl-label">Shift all chords</span>
            <div class="stepper">
              <button class="btn" onClick={() => commit(applyTranspose(song, -1))} aria-label="Shift all chords down a semitone">−1</button>
              <button class="btn" onClick={() => commit(applyTranspose(song, 1))} aria-label="Shift all chords up a semitone">+1</button>
            </div>
          </div>
          <div class="ctl">
            <span class="ctl-label">Text size</span>
            <div class="stepper">
              <button class="btn" onClick={() => setFontPx((f) => Math.max(12, f - 2))} aria-label="Smaller text">A−</button>
              <button class="btn" onClick={() => setFontPx((f) => Math.min(34, f + 2))} aria-label="Larger text">A+</button>
            </div>
          </div>
        </div>
        <p class="hint">
          Tap above a lyric to mark a spot, then press Add. Drag a chord to line it up, or use the arrows.
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
              pending={pending?.lineId === line.id ? { at: pending.at, text: pendingText || defaultChord } : null}
              onTapStrip={(at) => tapStrip(line.id, at)}
              onSelect={(id) => {
                setPending(null);
                setSel(id ? { lineId: line.id, chordId: id } : null);
              }}
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
                if (pending?.lineId === line.id) setPending(null);
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

      <div class="danger-zone">
        {confirmDelete ? (
          <div class="confirm" role="alertdialog" aria-label="Confirm delete">
            <span>Delete “{song.title || 'Untitled'}” for good?</span>
            <button class="btn danger" onClick={deleteSong}>Delete song</button>
            <button class="btn" onClick={() => setConfirmDelete(false)}>Keep it</button>
          </div>
        ) : (
          <button class="btn danger" onClick={() => setConfirmDelete(true)}>Delete this song</button>
        )}
      </div>

      {pending && pendingLine && !sel && (
        <div class="ctb-wrap" ref={toolbarRef}>
          <ChordToolbar
            mode="place"
            text={pendingText || defaultChord}
            songKey={songKey}
            isChordOnly={pendingLine.lyrics.length === 0}
            onText={setPendingText}
            onNudge={nudgePending}
            onConfirm={confirmPending}
            onDelete={() => setPending(null)}
            onClose={() => setPending(null)}
          />
        </div>
      )}
      {sel && selChord && (
        <div class="ctb-wrap" ref={toolbarRef}>
          <ChordToolbar
            mode="edit"
            text={selChord.text}
            songKey={songKey}
            isChordOnly={!!selLine && selLine.lyrics.length === 0}
            onText={onText}
            onNudge={onNudge}
            onConfirm={() => setSel(null)}
            onDelete={onDelete}
            onClose={() => setSel(null)}
          />
        </div>
      )}
    </div>
  );
}
