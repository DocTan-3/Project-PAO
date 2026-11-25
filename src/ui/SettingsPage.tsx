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

/** Settings: how the app looks. Every change applies at once and is remembered. */
export function SettingsPage({ onMenu }: { onMenu: () => void }) {
  const [palette, setPalette] = useState<Palette>(loadPalette);
  const [mode, setMode] = useState<Mode>(loadMode);
  const [face, setFace] = useState<FontFace>(loadFontFace);
  const [px, setPx] = useState(loadFontPx);
  const admin = useAdmin();
  const [pin, setPin] = useState('');
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

  const unlock = async () => {
    setAdminMsg(null);
    setAdminBusy(true);
    try {
      const r = await activateAdmin(pin);
      if (!r.ok) setAdminMsg({ ok: false, text: r.reason === 'pin' ? 'That PIN is not right.' : 'Admin mode is not set up in this app.' });
      else {
        setPin('');
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

      <section class="set-sec" aria-labelledby="set-share">
        <h2 id="set-share">Share with a friend</h2>
        <p class="set-hint">Send or receive songs as a file, for example by Quick Share or Bluetooth.</p>
        <a class="btn" id="share-link" href="#share">
          <Icon name="share" size={20} />
          Send or receive songs
        </a>
      </section>

      {adminAvailable && (
        <section class="set-sec" aria-labelledby="set-admin">
          <h2 id="set-admin">Admin</h2>
          {admin ? (
            <div class="admin-box">
              <p class="share-lead">This phone is the <b>admin</b>. Use <b>Share &amp; Update</b> in the menu to publish songs for everyone.</p>
              <button class="btn" id="admin-off" onClick={() => { turnOffAdmin(); setAdminMsg(null); }}>Turn off admin mode</button>
            </div>
          ) : (
            <form class="admin-box" onSubmit={(e) => { e.preventDefault(); if (pin.length === 6 && !adminBusy) void unlock(); }}>
              <label for="admin-pin" class="admin-label">For the team admin only. Enter the 6-digit PIN.</label>
              <div class="pin-row">
                <input
                  id="admin-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="off"
                  value={pin}
                  onInput={(e) => setPin((e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))}
                />
                <button class="btn primary" id="admin-unlock" type="submit" disabled={pin.length !== 6 || adminBusy}>Unlock</button>
              </div>
            </form>
          )}
          {adminMsg && <p class={`share-note ${adminMsg.ok ? 'ok' : 'bad'}`} role={adminMsg.ok ? 'status' : 'alert'} id="admin-note">{adminMsg.text}</p>}
        </section>
      )}
    </main>
  );
}
