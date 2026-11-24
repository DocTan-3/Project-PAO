import { useState } from 'preact/hooks';
import {
  FONTS,
  FONT_MAX,
  FONT_MIN,
  THEMES,
  type FontFace,
  type Theme,
  applyFontFace,
  applyTheme,
  fontInfo,
  loadFontFace,
  loadFontPx,
  loadTheme,
  saveFontFace,
  saveFontPx,
  saveTheme,
} from './appearance';
import { Icon } from './icons';

/** Settings: how the app and the songs look. Every change applies at once and is remembered. */
export function SettingsPage({ onMenu }: { onMenu: () => void }) {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [face, setFace] = useState<FontFace>(loadFontFace);
  const [px, setPx] = useState(loadFontPx);

  const pickTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    saveTheme(t);
  };
  const pickFace = (f: FontFace) => {
    setFace(f);
    applyFontFace(f);
    saveFontFace(f);
  };
  const setSize = (n: number) => {
    const v = Math.min(FONT_MAX, Math.max(FONT_MIN, n));
    setPx(v);
    saveFontPx(v);
  };

  return (
    <main class="library settings-page">
      <div class="lib-pinned page-pinned">
        <div class="lib-top">
          <div class="brand">
            <button class="btn icon ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
            Settings
          </div>
        </div>
      </div>

      <section class="set-sec" aria-labelledby="set-theme">
        <h2 id="set-theme">Color theme</h2>
        <div class="theme-grid" role="radiogroup" aria-label="Color theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              class={`theme-card${theme === t.id ? ' on' : ''}`}
              onClick={() => pickTheme(t.id)}
            >
              <span class="swatch" style={{ background: t.swatch[0], color: t.swatch[1] }} aria-hidden="true">
                <b style={{ color: t.swatch[2] }}>G</b>
                <i>Aa</i>
              </span>
              <span class="theme-name">{t.label}</span>
              {theme === t.id && <span class="theme-check" aria-hidden="true"><Icon name="check" size={16} /></span>}
            </button>
          ))}
        </div>
      </section>

      <section class="set-sec" aria-labelledby="set-font">
        <h2 id="set-font">Font</h2>
        <div class="font-list" role="radiogroup" aria-label="Song font">
          {FONTS.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={face === f.id}
              class={`font-card${face === f.id ? ' on' : ''}`}
              onClick={() => pickFace(f.id)}
            >
              <span class="font-sample" style={{ fontFamily: f.family }}>Amazing grace</span>
              <span class="font-meta">
                <b>{f.label}</b>
                <small>{f.note}</small>
              </span>
              {face === f.id && <span class="theme-check" aria-hidden="true"><Icon name="check" size={16} /></span>}
            </button>
          ))}
        </div>
      </section>

      <section class="set-sec" aria-labelledby="set-size">
        <h2 id="set-size">Font size</h2>
        <div class="size-row">
          <button class="btn" onClick={() => setSize(px - 2)} disabled={px <= FONT_MIN} aria-label="Smaller text">A−</button>
          <input
            type="range"
            min={FONT_MIN}
            max={FONT_MAX}
            step={2}
            value={px}
            onInput={(e) => setSize(Number((e.currentTarget as HTMLInputElement).value))}
            aria-label="Song text size"
          />
          <button class="btn" onClick={() => setSize(px + 2)} disabled={px >= FONT_MAX} aria-label="Larger text">A+</button>
          <output class="size-val">{px}</output>
        </div>
        <div class="preview" aria-label={`Preview in ${fontInfo(face).label}`} style={{ '--fs': `${px}px`, '--cs': `${Math.round(px * 0.9)}px` }}>
          <p class="pv-line">
            <span class="pv-seg"><b>G</b><span>Amazing </span></span>
            <span class="pv-seg"><b>C</b><span>grace, how </span></span>
            <span class="pv-seg"><b>G</b><span>sweet the sound</span></span>
          </p>
        </div>
      </section>
    </main>
  );
}
