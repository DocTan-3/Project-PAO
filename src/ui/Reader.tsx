import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { layoutLine } from '../layout/layoutLine';
import type { Instrument } from '../instruments';
import type { Song, ViewSettings } from '../model/types';
import {
  displayChord,
  semitonesToKey,
  songKeyOf,
  viewKey,
} from '../model/view';
import {
  type Key,
  formatKey,
  keySpelling,
  transposeKey,
} from '../theory';
import { FONT_FAMILY, loadFontPx, saveFontPx, useFontsReady } from './font';
import { Icon } from './icons';
import { ThemeToggle } from './theme';
import { buildTimeline, DEFAULT_BEATS_PER_CHORD } from '../model/timeline';
import { ChordPanel } from './ChordPanel';
import { ChordSheet } from './ChordSheet';
import { loadInstrument, saveInstrument } from './ChordView';
import { makeMeasure } from './measure';
import { PlayBar } from './PlayBar';
import { SPEEDS, TempoSheet } from './TempoSheet';
import { useAutoscroll } from './useAutoscroll';


const DEFAULT_BPM = 90;

interface Timing {
  beats: number;
  speed: number;
}
function loadTiming(id: string): Timing {
  try {
    const raw = localStorage.getItem(`pao:timing:${id}`);
    if (raw) {
      const t = JSON.parse(raw);
      return { beats: Number(t.beats) || DEFAULT_BEATS_PER_CHORD, speed: SPEEDS.includes(t.speed) ? t.speed : 1 };
    }
  } catch {
    /* storage unavailable */
  }
  return { beats: DEFAULT_BEATS_PER_CHORD, speed: 1 };
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
  onSongChange,
}: {
  song: Song;
  onBack: () => void;
  onEdit: () => void;
  onSongChange: (patch: Partial<Pick<Song, 'bpm'>>) => void;
}) {
  const [view, setView] = useState<ViewSettings>(() => loadView(song.id));
  const [fontPx, setFontPx] = useState<number>(loadFontPx);
  const [instrument, setInstrument] = useState<Instrument>(loadInstrument);
  const [sheet, setSheet] = useState<string | null>(null);
  const [bpm, setBpmState] = useState<number>(song.bpm ?? DEFAULT_BPM);
  const [timing, setTiming] = useState<Timing>(() => loadTiming(song.id));
  const [tempoOpen, setTempoOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveBpm = useRef(0);
  const [width, setWidth] = useState(0);
  const fontsReady = useFontsReady();

  useEffect(() => {
    try {
      localStorage.setItem(`pao:view:${song.id}`, JSON.stringify(view));
    } catch {
      /* ignore */
    }
  }, [view, song.id]);
  useEffect(() => saveFontPx(fontPx), [fontPx]);
  useEffect(() => {
    try {
      localStorage.setItem(`pao:timing:${song.id}`, JSON.stringify(timing));
    } catch {
      /* ignore */
    }
  }, [timing, song.id]);
  // the tempo is part of the song, so keep it (debounced: tapping changes it many times a second)
  const setBpm = (n: number) => {
    setBpmState(n);
    clearTimeout(saveBpm.current);
    saveBpm.current = window.setTimeout(() => onSongChange({ bpm: n }), 500);
  };
  const timeline = useMemo(() => buildTimeline(song, timing.beats), [song, timing.beats]);
  const auto = useAutoscroll({ timeline, bpm, speed: timing.speed });
  const openSheet = (text: string) => {
    auto.stop();
    setSheet(text);
  };
  useEffect(() => saveInstrument(instrument), [instrument]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const chordPx = Math.round(fontPx * 0.9);
  const measureLyric = useMemo(
    () => makeMeasure(`400 ${fontPx}px ${FONT_FAMILY}`),
    [fontPx, fontsReady],
  );
  const measureChord = useMemo(
    () => makeMeasure(`700 ${chordPx}px ${FONT_FAMILY}`),
    [chordPx, fontsReady],
  );

  const songKey = songKeyOf(song);
  const vk = viewKey(song, view);

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
  const shownKey = vk ?? songKey;

  return (
    <div class="reader" style={{ '--fs': `${fontPx}px`, '--cs': `${chordPx}px` }}>
      <header class="topbar">
        <button class="btn icon ghost" onClick={onBack} aria-label="Back to library"><Icon name="back" /></button>
        <div class="titles">
          <h1>{song.title || 'Untitled'}</h1>
          {song.artist && <p>{song.artist}</p>}
        </div>
        <ThemeToggle />
        <button class="btn edit-btn" onClick={onEdit} aria-label="Edit song">
          <Icon name="edit" size={20} />
          <span class="lbl">Edit</span>
        </button>
      </header>

      {(shownKey || song.bpm) && (
        <div class="tags">
          {shownKey && (
            <span class={`tag${semis !== 0 ? ' changed' : ''}`}>
              Key <b>{formatKey(shownKey)}</b>
              {semis !== 0 && <span class="muted">({semisLabel})</span>}
            </span>
          )}
          {song.bpm && <span class="tag"><b>{song.bpm}</b> BPM</span>}
        </div>
      )}

      <div class="reader-layout">
        <aside class="reader-side">
          <div class="bottom-stack">
          <PlayBar
            playing={auto.playing}
            finished={auto.finished}
            bpm={bpm}
            speed={timing.speed}
            onToggle={auto.toggle}
            onRestart={auto.restart}
            onTempo={() => setTempoOpen(true)}
          />
          <div class="dock" role="toolbar" aria-label="Song controls">
            {songKey && (
              <label class="ctl">
                <span class="ctl-label">Key</span>
                <span class="pill-select">
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
                  <Icon name="down" size={16} />
                </span>
              </label>
            )}

            <div class="ctl">
              <span class="ctl-label">Transpose</span>
              <div class="stepgrp">
                <button class="stepbtn" onClick={() => setSemis(semis - 1)} aria-label="Down a semitone"><Icon name="minus" size={20} /></button>
                <button
                  class={`stepval${semis !== 0 ? ' on' : ''}`}
                  onClick={() => setView({ semitones: 0 })}
                  disabled={semis === 0}
                  aria-label={semis === 0 ? 'Original key' : `Transposed ${semisLabel}. Tap to reset.`}
                  title={semis === 0 ? 'Original key' : 'Tap to reset'}
                >
                  {semisLabel}
                </button>
                <button class="stepbtn" onClick={() => setSemis(semis + 1)} aria-label="Up a semitone"><Icon name="plus" size={20} /></button>
              </div>
            </div>

            <div class="ctl">
              <span class="ctl-label">Text size</span>
              <div class="stepgrp">
                <button class="stepbtn" onClick={() => setFontPx((f) => Math.max(12, f - 2))} aria-label="Smaller text"><span class="aa sm">A</span></button>
                <button class="stepbtn" onClick={() => setFontPx((f) => Math.min(34, f + 2))} aria-label="Larger text"><span class="aa lg">A</span></button>
              </div>
            </div>
          </div>
          </div>

          {song.notes?.trim() && (
            <section class="notes" aria-label="Notes">
              <h2>Notes</h2>
              <p>{song.notes}</p>
            </section>
          )}

          <ChordPanel chords={songChords} instrument={instrument} onInstrument={setInstrument} onOpen={openSheet} />
        </aside>

        <div class="reader-main">
          <div class={`song${auto.playing ? ' playing' : ''}`} ref={bodyRef}>
            {width > 0 &&
              song.sections.map((sec) => (
                <section key={sec.id}>
                  {sec.label && <h2>{sec.label}</h2>}
                  {sec.lines.map((line) => {
                    const chords = line.chords.map((c) => ({ ...c, text: displayChord(c.text, song, view) }));
                    const rows = layoutLine(line.lyrics, chords, measureLyric, measureChord, width, chordPx * 0.5);
                    return (
                      <div class={`line${auto.now.lineId === line.id ? ' now' : ''}`} key={line.id} data-line-id={line.id}>
                        {rows.map((r) => (
                          <div class={`row${r.chords.length ? ' has-chords' : ''}`}>
                            {r.chords.map((c) => (
                              <button
                                type="button"
                                class={`chord${auto.now.chordId === c.id ? ' now' : ''}`}
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

      {tempoOpen && (
        <TempoSheet
          bpm={bpm}
          onBpm={setBpm}
          beats={timing.beats}
          onBeats={(beats) => setTiming((t) => ({ ...t, beats }))}
          speed={timing.speed}
          onSpeed={(speed) => setTiming((t) => ({ ...t, speed }))}
          onClose={() => setTempoOpen(false)}
        />
      )}
      {sheet && (
        <ChordSheet text={sheet} instrument={instrument} onInstrument={setInstrument} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
