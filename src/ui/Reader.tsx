import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { layoutLine } from '../layout/layoutLine';
import type { Song, ViewSettings } from '../model/types';
import {
  displayChord,
  semitonesToKey,
  shapeKey,
  songKeyOf,
  viewKey,
} from '../model/view';
import {
  type Key,
  capoSuggestions,
  formatKey,
  keySpelling,
  transposeKey,
} from '../theory';
import { makeMeasure } from './measure';

const FONT_FAMILY = '"Inter Variable", system-ui, sans-serif';
const CAPOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function loadView(id: string): ViewSettings {
  try {
    const raw = localStorage.getItem(`pao:view:${id}`);
    if (raw) return { semitones: 0, capo: 0, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { semitones: 0, capo: 0 };
}

function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts.load(`400 16px ${FONT_FAMILY}`).then(() => document.fonts.load(`700 16px ${FONT_FAMILY}`)).finally(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

export function Reader({ song, onBack }: { song: Song; onBack: () => void }) {
  const [view, setView] = useState<ViewSettings>(() => loadView(song.id));
  const [fontPx, setFontPx] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('pao:font')) || 18;
    } catch {
      return 18;
    }
  });
  const bodyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const fontsReady = useFontsReady();

  useEffect(() => {
    try {
      localStorage.setItem(`pao:view:${song.id}`, JSON.stringify(view));
      localStorage.setItem('pao:font', String(fontPx));
    } catch {
      /* ignore */
    }
  }, [view, fontPx, song.id]);

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
  const sk = shapeKey(song, view);

  const keyChoices: Key[] = useMemo(() => {
    if (!songKey) return [];
    const out: Key[] = [];
    for (let i = 0; i < 12; i++) out.push(transposeKey(songKey, i, keySpelling(songKey)));
    return out;
  }, [song.key]);

  const friendly = useMemo(
    () => (vk ? new Set(capoSuggestions(vk).filter((o) => o.friendly).map((o) => o.capo)) : new Set<number>()),
    [vk && formatKey(vk)],
  );

  // keep the offset within -5..+6 so the label stays readable
  const setSemis = (n: number) => setView((v) => ({ ...v, semitones: (((n + 5) % 12) + 12) % 12 - 5 }));

  return (
    <div class="reader" style={{ '--fs': `${fontPx}px`, '--cs': `${chordPx}px` }}>
      <header class="bar">
        <button class="btn" onClick={onBack} aria-label="Back to library">‹</button>
        <div class="titles">
          <h1>{song.title}</h1>
          <p>{song.artist}</p>
        </div>
      </header>

      <div class="controls" role="toolbar" aria-label="Song controls">
        {songKey && (
          <label class="ctl">
            <span>Key</span>
            <select
              value={vk ? formatKey(vk) : ''}
              onChange={(e) => {
                const target = keyChoices.find((k) => formatKey(k) === (e.target as HTMLSelectElement).value);
                const n = target ? semitonesToKey(song, target) : null;
                if (n !== null) setView((v) => ({ ...v, semitones: n }));
              }}
            >
              {keyChoices.map((k) => (
                <option value={formatKey(k)}>
                  {formatKey(k)}
                  {formatKey(k) === song.key ? ' (original)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div class="ctl">
          <span>Transpose</span>
          <div class="stepper">
            <button class="btn" onClick={() => setSemis(view.semitones - 1)} aria-label="Down a semitone">−</button>
            <output>{view.semitones > 0 ? `+${view.semitones}` : view.semitones}</output>
            <button class="btn" onClick={() => setSemis(view.semitones + 1)} aria-label="Up a semitone">+</button>
          </div>
        </div>

        <label class="ctl">
          <span>Capo</span>
          <select
            value={view.capo}
            onChange={(e) => setView((v) => ({ ...v, capo: Number((e.target as HTMLSelectElement).value) }))}
          >
            {CAPOS.map((c) => (
              <option value={c}>
                {c === 0 ? 'None' : `Fret ${c}`}
                {c > 0 && friendly.has(c) ? ' ★' : ''}
              </option>
            ))}
          </select>
        </label>

        <div class="ctl">
          <span>Size</span>
          <div class="stepper">
            <button class="btn" onClick={() => setFontPx((f) => Math.max(12, f - 2))} aria-label="Smaller text">A−</button>
            <button class="btn" onClick={() => setFontPx((f) => Math.min(34, f + 2))} aria-label="Larger text">A+</button>
          </div>
        </div>

        {(view.semitones !== 0 || view.capo !== 0) && (
          <button class="btn reset" onClick={() => setView({ semitones: 0, capo: 0 })}>Reset</button>
        )}
      </div>

      {sk && (
        <p class="shapes">
          Sounds in <b>{formatKey(vk!)}</b>
          {view.capo > 0 && (
            <>
              {' '}· play <b>{formatKey(sk)}</b> shapes with capo {view.capo}
            </>
          )}
        </p>
      )}

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
                          <span class="chord" key={c.id} style={{ left: `${c.x}px` }}>
                            {c.text}
                          </span>
                        ))}
                        <span class="lyric">{r.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>
          ))}
      </div>
    </div>
  );
}
