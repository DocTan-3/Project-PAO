import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Instrument } from '../instruments';
import { layoutLine } from '../layout/layoutLine';
import type { Song, ViewSettings } from '../model/types';
import { displayChord, semitonesToKey, songKeyOf, viewKey } from '../model/view';
import { type Key, formatKey, keySpelling, transposeKey } from '../theory';
import { ChordPanel } from './ChordPanel';
import { ChordSheet } from './ChordSheet';
import { loadInstrument, saveInstrument } from './ChordView';
import { FONT_FAMILY, loadFontPx, saveFontPx, useFontsReady } from './font';
import { Icon } from './icons';
import { useKeepAwakeSetting, useScreenAwake } from './keepAwake';
import { makeMeasure } from './measure';
import { ThemeToggle } from './theme';
import { MAX_SPEED, loadSpeed, saveSpeed, useAutoscroll } from './useAutoscroll';
import { type SwipeDir, rememberDirection, takeDirection, useSwipeNav } from './useSwipe';

/** Neighbouring songs for swiping (a line up in service order, or all songs of a language). */
export interface ReaderNav {
  /** the slot this song fills in a line up, e.g. "Worship 2" (shown above the title) */
  slot?: string;
  prev?: { title: string; go: () => void };
  next?: { title: string; go: () => void };
}

function loadView(id: string): ViewSettings {
  try {
    const raw = localStorage.getItem(`pao:view:${id}`);
    if (raw) return { semitones: 0, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { semitones: 0 };
}

export function Reader({
  song,
  onBack,
  onEdit,
  nav,
}: {
  song: Song;
  onBack: () => void;
  onEdit: () => void;
  nav?: ReaderNav;
}) {
  const [view, setView] = useState<ViewSettings>(() => loadView(song.id));
  const [fontPx, setFontPx] = useState<number>(loadFontPx);
  const [speed, setSpeed] = useState<number>(loadSpeed);
  const [instrument, setInstrument] = useState<Instrument>(loadInstrument);
  const [sheet, setSheet] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const [enter] = useState<SwipeDir | null>(takeDirection);
  const [toast, setToast] = useState<string | null>(null);
  // the screen stays on while a song is open (unless the user turned that off)
  const [awake, setAwake] = useKeepAwakeSetting();
  useScreenAwake(awake);
  const [width, setWidth] = useState(0);
  const fontsReady = useFontsReady();

  const auto = useAutoscroll({ speed, fontPx });
  const openSheet = (text: string) => {
    auto.stop();
    setSheet(text);
  };

  useEffect(() => {
    try {
      localStorage.setItem(`pao:view:${song.id}`, JSON.stringify(view));
    } catch {
      /* ignore */
    }
  }, [view, song.id]);
  useEffect(() => saveFontPx(fontPx), [fontPx]);
  useEffect(() => saveSpeed(speed), [speed]);
  useEffect(() => saveInstrument(instrument), [instrument]);

  // swipe (or arrow keys) to the next / previous song of the line up or the song list
  const go = (dir: SwipeDir) => {
    const target = dir === 'next' ? nav?.next : nav?.prev;
    if (!target) return;
    auto.stop();
    rememberDirection(dir);
    target.go();
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);
  useSwipeNav(swipeRef, {
    canPrev: !!nav?.prev,
    canNext: !!nav?.next,
    onPrev: () => go('prev'),
    onNext: () => go('next'),
    onEdge: (dir) => nav && setToast(dir === 'next' ? 'That was the last song' : 'This is the first song'),
    disabled: !nav || !!sheet,
  });

  // lyrics width, and the pinned header's height (the tablet sidebar sticks just below it)
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--head-h', `${el.offsetHeight}px`);
    const ro = new ResizeObserver(set);
    ro.observe(el);
    set();
    return () => ro.disconnect();
  }, []);

  const chordPx = Math.round(fontPx * 0.9);
  const measureLyric = useMemo(() => makeMeasure(`400 ${fontPx}px ${FONT_FAMILY}`), [fontPx, fontsReady]);
  const measureChord = useMemo(() => makeMeasure(`700 ${chordPx}px ${FONT_FAMILY}`), [chordPx, fontsReady]);

  const songKey = songKeyOf(song);
  const vk = viewKey(song, view);
  const shownKey = vk ?? songKey;

  // every distinct chord in the song as displayed (after transpose), in order of first appearance
  const songChords = useMemo(() => {
    const seen = new Set<string>();
    for (const sec of song.sections)
      for (const line of sec.lines)
        for (const c of [...line.chords].sort((a, b) => a.at - b.at)) seen.add(displayChord(c.text, song, view));
    return [...seen];
  }, [song, view.semitones]);

  const keyChoices: Key[] = useMemo(() => {
    if (!songKey) return [];
    const out: Key[] = [];
    for (let i = 0; i < 12; i++) out.push(transposeKey(songKey, i, keySpelling(songKey)));
    return out;
  }, [song.key]);

  // keep the offset within -5..+6 so the label stays readable
  const setSemis = (n: number) => setView((v) => ({ ...v, semitones: (((n + 5) % 12) + 12) % 12 - 5 }));
  const semis = view.semitones;
  const semisLabel = semis > 0 ? `+${semis}` : String(semis);

  return (
    <div class={`reader${enter ? ` enter-${enter}` : ''}`} style={{ '--fs': `${fontPx}px`, '--cs': `${chordPx}px` }}>
      <header class="reader-head" ref={headRef}>
        <div class="topbar">
          <button class="btn icon ghost" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
          <div class="titles">
            {nav?.slot && <span class="slotname">{nav.slot}</span>}
            <h1>{song.title || 'Untitled'}</h1>
            {song.artist && <p>{song.artist}</p>}
          </div>
          <button
            class={`btn icon ghost awake-btn${awake ? ' on' : ''}`}
            aria-pressed={awake}
            aria-label={awake ? 'Screen stays on while reading. Tap to let it sleep.' : 'Screen may go to sleep. Tap to keep it on.'}
            title={awake ? 'Screen stays on' : 'Screen may sleep'}
            onClick={() => {
              setAwake(!awake);
              setToast(awake ? 'Screen can sleep again' : 'Screen will stay on');
            }}
          >
            <Icon name={awake ? 'eye' : 'eyeoff'} />
          </button>
          <ThemeToggle />
          <button class="btn edit-btn" onClick={onEdit} aria-label="Edit song">
            <Icon name="edit" size={20} />
            <span class="lbl">Edit</span>
          </button>
        </div>

        {/* one line: play, key, key +/-, scroll speed +/-, text size, restart */}
        <div class="controlbar" role="toolbar" aria-label="Song controls">
          <button
            class={`playbtn${auto.playing ? ' on' : ''}`}
            onClick={auto.toggle}
            aria-label={auto.playing ? 'Pause scrolling' : auto.finished ? 'Scroll again' : 'Start scrolling'}
          >
            <Icon name={auto.playing ? 'pause' : 'play'} size={20} />
          </button>

          {songKey && (
            <span class="pill-select compact">
              <select
                aria-label="Key"
                value={vk ? formatKey(vk) : ''}
                onChange={(e) => {
                  const target = keyChoices.find((k) => formatKey(k) === (e.target as HTMLSelectElement).value);
                  const n = target ? semitonesToKey(song, target) : null;
                  if (n !== null) setView((v) => ({ ...v, semitones: n }));
                }}
              >
                {keyChoices.map((k) => (
                  <option value={formatKey(k)}>{formatKey(k)}</option>
                ))}
              </select>
              <Icon name="down" size={12} />
            </span>
          )}

          <div class="stepgrp compact" role="group" aria-label="Transpose">
            <button class="stepbtn" onClick={() => setSemis(semis - 1)} aria-label="Down a semitone"><Icon name="minus" size={14} /></button>
            <button
              class={`stepval${semis !== 0 ? ' on' : ''}`}
              onClick={() => setView({ semitones: 0 })}
              disabled={semis === 0}
              aria-label={semis === 0 ? 'Original key' : `Transposed ${semisLabel}. Tap to reset.`}
              title={semis === 0 ? 'Original key' : 'Tap to reset'}
            >
              {semisLabel}
            </button>
            <button class="stepbtn" onClick={() => setSemis(semis + 1)} aria-label="Up a semitone"><Icon name="plus" size={14} /></button>
          </div>

          <div class="stepgrp compact" role="group" aria-label="Scroll speed">
            <button class="stepbtn" onClick={() => setSpeed((s) => Math.max(1, s - 1))} disabled={speed <= 1} aria-label="Scroll slower"><Icon name="minus" size={14} /></button>
            <span class="stepval speedval" aria-label={`Scroll speed ${speed} of ${MAX_SPEED}`} title={`Scroll speed ${speed} of ${MAX_SPEED}`}>
              <Icon name="timer" size={12} />
              {speed}
            </span>
            <button class="stepbtn" onClick={() => setSpeed((s) => Math.min(MAX_SPEED, s + 1))} disabled={speed >= MAX_SPEED} aria-label="Scroll faster"><Icon name="plus" size={14} /></button>
          </div>

          <div class="stepgrp compact" role="group" aria-label="Text size">
            <button class="stepbtn" onClick={() => setFontPx((f) => Math.max(12, f - 2))} aria-label="Smaller text"><span class="aa sm">A</span></button>
            <button class="stepbtn" onClick={() => setFontPx((f) => Math.min(34, f + 2))} aria-label="Larger text"><span class="aa lg">A</span></button>
          </div>

          <button class="btn icon ghost restart-btn" onClick={auto.restart} aria-label="Back to the top" title="Back to the top">
            <Icon name="restart" size={20} />
          </button>
        </div>
      </header>

      {shownKey && (
        <div class="tags">
          <span class={`tag${semis !== 0 ? ' changed' : ''}`}>
            Key <b>{formatKey(shownKey)}</b>
            {semis !== 0 && <span class="muted">({semisLabel})</span>}
          </span>
        </div>
      )}

      <div class="reader-layout" ref={swipeRef}>
        <aside class="reader-side">
          {song.notes?.trim() && (
            <section class="notes" aria-label="Notes">
              <h2>Notes</h2>
              <p>{song.notes}</p>
            </section>
          )}

          <ChordPanel chords={songChords} instrument={instrument} onInstrument={setInstrument} onOpen={openSheet} />
        </aside>

        <div class="reader-main">
          <div class="song" ref={bodyRef}>
            {width > 0 &&
              song.sections.map((sec) => (
                <section key={sec.id}>
                  {sec.label && <h2>{sec.label}</h2>}
                  {sec.lines.map((line) => {
                    const chords = line.chords.map((c) => ({ ...c, text: displayChord(c.text, song, view) }));
                    const rows = layoutLine(line.lyrics, chords, measureLyric, measureChord, width, chordPx * 0.5);
                    return (
                      <div class="line" key={line.id}>
                        {rows.map((r) => (
                          <div class={`row${r.chords.length ? ' has-chords' : ''}`}>
                            {r.chords.map((c) => (
                              <button
                                type="button"
                                class="chord"
                                key={c.id}
                                style={{ left: `${c.x}px` }}
                                onClick={() => openSheet(c.text)}
                                aria-label={`Show how to play ${c.text}`}
                              >
                                {c.text}
                              </button>
                            ))}
                            <span class="lyric">{r.text || ' '}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </section>
              ))}
          </div>
        </div>
      </div>

      {toast && <div class="toast" role="status">{toast}</div>}
      {sheet && (
        <ChordSheet text={sheet} instrument={instrument} onInstrument={setInstrument} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
