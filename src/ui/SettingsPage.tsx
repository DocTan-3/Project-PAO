import { useEffect, useState } from 'preact/hooks';
import { activateAdmin, stillAdmin, turnOffAdmin, useAdmin } from '../admin/admin';
import { adminAvailable } from '../admin/config';
import { packErrorText } from '../admin/github';
import {
  FONTS,
  FONT_MAX,
  FONT_MIN,
  MODES,
  PALETTES,
  type FontFace,
  type Mode,
  type Palette,
  applyFontFace,
  applyLook,
  fontInfo,
  loadFontFace,
  loadFontPx,
  loadMode,
  loadPalette,
  saveFontFace,
  saveFontPx,
  saveMode,
  savePalette,
  swatchOf,
} from './appearance';
import { Icon } from './icons';
import { VERSES, Verse } from './verses';
import { ThemeToggle } from './theme';

/** Settings: how the app looks. Every change applies at once and is remembered. */
export function SettingsPage({ onMenu }: { onMenu: () => void }) {
  const [palette, setPalette] = useState<Palette>(loadPalette);
  const [mode, setMode] = useState<Mode>(loadMode);
  const [face, setFace] = useState<FontFace>(loadFontFace);
  const [px, setPx] = useState(loadFontPx);
  const admin = useAdmin();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminMsg, setAdminMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  // an admin phone checks that no other phone has taken over
  useEffect(() => {
    if (!admin) return;
    stillAdmin()
      .then((ok) => {
        if (!ok) setAdminMsg({ ok: false, text: 'Another phone is now the admin. This phone is back to normal.' });
      })
      .catch(() => undefined);
  }, [admin]);

  const passwordField = {
    id: 'admin-password',
    autoComplete: 'off',
    autoCapitalize: 'off' as const,
    autoCorrect: 'off',
    spellcheck: false,
    value: password,
    onInput: (e: Event) => setPassword((e.currentTarget as HTMLInputElement).value),
  };

  const unlock = async () => {
    setAdminMsg(null);
    setAdminBusy(true);
    try {
      const r = await activateAdmin(password);
      if (!r.ok) setAdminMsg({ ok: false, text: r.reason === 'password' ? 'That password is not right.' : 'Admin mode is not set up in this app.' });
      else {
        setPassword('');
        setAdminMsg({ ok: true, text: r.tookOver ? 'Admin mode is on. The phone that was the admin before has been switched off.' : 'Admin mode is on.' });
      }
    } catch (e) {
      setAdminMsg({ ok: false, text: packErrorText(e) });
    } finally {
      setAdminBusy(false);
    }
  };

  const pickPalette = (p: Palette) => {
    setPalette(p);
    applyLook(p, mode);
    savePalette(p);
  };
  const pickMode = (m: Mode) => {
    setMode(m);
    applyLook(palette, m);
    saveMode(m);
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
          <ThemeToggle />
        </div>
      </div>

      <section class="set-sec" aria-labelledby="set-mode">
        <h2 id="set-mode">Day or Night</h2>
        <div class="seg mode-seg" role="radiogroup" aria-label="Day or Night">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={mode === m.id}
              class={`seg-btn${mode === m.id ? ' on' : ''}`}
              onClick={() => pickMode(m.id)}
            >
              <Icon name={m.id === 'day' ? 'sun' : 'sparkles'} size={18} />
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section class="set-sec" aria-labelledby="set-theme">
        <h2 id="set-theme">Color palette</h2>
        <div class="theme-grid" role="radiogroup" aria-label="Color palette">
          {PALETTES.map((p) => {
            const [bg, fg, accent] = swatchOf(p.id, mode);
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={palette === p.id}
                class={`theme-card${palette === p.id ? ' on' : ''}`}
                onClick={() => pickPalette(p.id)}
              >
                <span class="swatch" style={{ background: bg, color: fg }} aria-hidden="true">
                  <b style={{ color: accent }}>G</b>
                  <i>Aa</i>
                </span>
                <span class="theme-name">{p.label}</span>
                {palette === p.id && <span class="theme-check" aria-hidden="true"><Icon name="check" size={16} /></span>}
              </button>
            );
          })}
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
              style={{ fontFamily: f.family }}
              onClick={() => pickFace(f.id)}
            >
              <span class="font-sample">All for His Glory</span>
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
        <p class="set-hint">Applies to the whole app, not just the songs.</p>
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
            <span class="pv-seg"><b>G</b><span>All for </span></span>
            <span class="pv-seg"><b>C</b><span>His </span></span>
            <span class="pv-seg"><b>G</b><span>Glory</span></span>
          </p>
        </div>
      </section>

      {adminAvailable && (
        <section class="set-sec" aria-labelledby="set-admin">
          <h2 id="set-admin">Admin</h2>
          {admin ? (
            <div class="admin-box">
              <p class="share-lead">This phone is the <b>admin</b>. Use <b>Update</b> on the Songs and Line up screens to share your songs and line ups with everyone.</p>
              <button class="btn" id="admin-off" onClick={() => { turnOffAdmin(); setAdminMsg(null); }}>Turn off admin mode</button>
            </div>
          ) : (
            <form class="admin-box" onSubmit={(e) => { e.preventDefault(); if (password.length > 0 && !adminBusy) void unlock(); }}>
              <label for="admin-password" class="admin-label">For the team admin only. Enter the admin password.</label>
              <div class="pin-row">
                {showPassword ? <input type="text" {...passwordField} /> : <input type="password" {...passwordField} />}
                <button class="btn" id="admin-show" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button class="btn primary" id="admin-unlock" type="submit" disabled={password.length === 0 || adminBusy}>Unlock</button>
            </form>
          )}
          {adminMsg && <p class={`share-note ${adminMsg.ok ? 'ok' : 'bad'}`} role={adminMsg.ok ? 'status' : 'alert'} id="admin-note">{adminMsg.text}</p>}
        </section>
      )}

      <Verse id="verse" text={VERSES.settings} />
      <p class="about" id="app-version">BPCG - PAW · version {__APP_VERSION__}</p>
    </main>
  );
}
