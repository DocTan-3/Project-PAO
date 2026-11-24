/**
 * The look of the app, chosen in Settings: a colour palette, Day or Night, one font for the whole app,
 * and the size of the song text. Everything is stored on the phone (localStorage) and applied to the
 * page as attributes / CSS variables.
 */
import { SWATCHES } from './swatches';

// ---- Day / Night ----

export type Mode = 'day' | 'night';
export const MODES: { id: Mode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'night', label: 'Night' },
];

// ---- palettes: each one has a Day look and a Night look (its darker twin) ----

export type Palette = 'classic' | 'bpcg' | 'devotion' | 'deep' | 'freedom' | 'grace' | 'sacrifice';

export type PaletteInfo = { id: Palette; label: string; note: string };

export const PALETTES: PaletteInfo[] = [
  { id: 'classic', label: 'Servant', note: 'Black and white' },
  { id: 'bpcg', label: 'BPCG', note: 'Warm browns' },
  { id: 'devotion', label: 'Devotion', note: 'Notebook paper, ruled lines' },
  { id: 'deep', label: 'Deep', note: 'Blues' },
  { id: 'freedom', label: 'Freedom', note: 'Greens' },
  { id: 'grace', label: 'Grace', note: 'Pinks' },
  { id: 'sacrifice', label: 'Sacrifice', note: 'Lavender and royal purple' },
];

/** [background, text, accent] of a palette in a mode, for the little previews in Settings. */
export const swatchOf = (p: Palette, m: Mode): [string, string, string] => SWATCHES[p]![m];

const PALETTE_KEY = 'pao:palette';
const MODE_KEY = 'pao:mode';
const isPalette = (v: unknown): v is Palette => PALETTES.some((p) => p.id === v);

/** Before palettes existed there was one list of themes; map the old saved choice onto palette + mode. */
const OLD_THEMES: Record<string, [Palette, Mode]> = {
  light: ['classic', 'day'],
  dark: ['classic', 'night'],
  bpcg: ['bpcg', 'day'],
  paper: ['devotion', 'day'],
  midnight: ['deep', 'night'],
  forest: ['freedom', 'day'],
  rose: ['grace', 'day'],
};

function oldTheme(): [Palette, Mode] | null {
  try {
    return OLD_THEMES[localStorage.getItem('pao:theme') ?? ''] ?? null;
  } catch {
    return null;
  }
}

export function loadPalette(): Palette {
  try {
    const v = localStorage.getItem(PALETTE_KEY);
    if (isPalette(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return oldTheme()?.[0] ?? 'classic';
}

export function loadMode(): Mode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'day' || v === 'night') return v;
  } catch {
    /* storage unavailable */
  }
  return oldTheme()?.[1] ?? 'day';
}

export function savePalette(p: Palette): void {
  try {
    localStorage.setItem(PALETTE_KEY, p);
  } catch {
    /* ignore */
  }
}
export function saveMode(m: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}

export function applyLook(p: Palette, m: Mode): void {
  const root = document.documentElement;
  root.setAttribute('data-palette', p);
  root.setAttribute('data-mode', m);
  root.setAttribute('data-tone', m === 'night' ? 'dark' : 'light'); // the phone's system bars follow this
}

export const otherMode = (m: Mode): Mode => (m === 'day' ? 'night' : 'day');

// ---- font: one choice for the whole app (headings, buttons, boxes and the songs) ----

export type FontFace = 'loved' | 'chosen' | 'saved' | 'redeemed' | 'forgiven';

export type FontInfo = { id: FontFace; label: string; family: string; note: string };

export const FONTS: FontInfo[] = [
  { id: 'loved', label: 'Loved', family: '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif', note: 'Clean and neutral (default)' },
  { id: 'chosen', label: 'Chosen', family: '"Nunito Variable", system-ui, sans-serif', note: 'Soft and rounded' },
  { id: 'saved', label: 'Saved', family: '"Lora Variable", Georgia, serif', note: 'Book-like serif' },
  { id: 'redeemed', label: 'Redeemed', family: '"JetBrains Mono Variable", ui-monospace, monospace', note: 'Typewriter style, chords line up' },
  { id: 'forgiven', label: 'Forgiven', family: '"Caveat Variable", cursive', note: 'Pen on a notebook page' },
];

const FONT_KEY = 'pao:fontface';
export const fontInfo = (f: FontFace): FontInfo => FONTS.find((x) => x.id === f) ?? FONTS[0]!;

/** Font names used before the renaming. */
const OLD_FONTS: Record<string, FontFace> = { inter: 'loved', nunito: 'chosen', lora: 'saved', serif: 'saved', mono: 'redeemed', caveat: 'forgiven' };

export function loadFontFace(): FontFace {
  try {
    const v = localStorage.getItem(FONT_KEY) ?? '';
    if (FONTS.some((f) => f.id === v)) return v as FontFace;
    if (OLD_FONTS[v]) return OLD_FONTS[v]!;
  } catch {
    /* storage unavailable */
  }
  return 'loved';
}

let currentFamily = FONTS[0]!.family;

/** The CSS font-family of the app right now (used to measure text for chord alignment). */
export const songFamily = (): string => currentFamily;

export function applyFontFace(f: FontFace): void {
  currentFamily = fontInfo(f).family;
  const style = document.documentElement.style;
  style.setProperty('--sans', currentFamily);
  style.setProperty('--display', currentFamily);
  style.setProperty('--song-font', currentFamily);
  document.documentElement.setAttribute('data-font', f);
}

export function saveFontFace(f: FontFace): void {
  try {
    localStorage.setItem(FONT_KEY, f);
  } catch {
    /* ignore */
  }
}

// ---- song text size (shared with the size button in the reader) ----

export const FONT_MIN = 12;
export const FONT_MAX = 34;
export const FONT_DEFAULT = 18;

export function loadFontPx(): number {
  try {
    const n = Number(localStorage.getItem('pao:font'));
    if (n >= FONT_MIN && n <= FONT_MAX) return n;
  } catch {
    /* storage unavailable */
  }
  return FONT_DEFAULT;
}
export function saveFontPx(n: number): void {
  try {
    localStorage.setItem('pao:font', String(n));
  } catch {
    /* ignore */
  }
  applyTextSize(n);
}

/**
 * The text size applies to the whole app: the songs use it directly, and everything else (titles, buttons,
 * labels, boxes) scales with it, kept between 80% and 150% so screens stay usable.
 */
export function applyTextSize(px: number): void {
  const scale = Math.min(1.5, Math.max(0.8, px / FONT_DEFAULT));
  const root = document.documentElement;
  root.style.fontSize = `${Math.round(scale * 1000) / 10}%`;
  root.style.setProperty('--ui-scale', String(scale));
}
