/**
 * The look of the app, chosen in Settings: colour theme, the font of the song text, and its size.
 * Everything is stored on the phone (localStorage) and applied to the page as attributes / CSS variables.
 */

export type Theme = 'light' | 'dark' | 'bpcg' | 'paper' | 'midnight' | 'forest' | 'rose';

export type ThemeInfo = {
  id: Theme;
  label: string;
  /** a dark background: the phone's system bar icons and the quick toggle follow this */
  dark: boolean;
  /** background, text and accent, for the little preview in Settings */
  swatch: [string, string, string];
  hint?: string;
};

export const THEMES: ThemeInfo[] = [
  { id: 'light', label: 'Light', dark: false, swatch: ['#ffffff', '#000000', '#000000'] },
  { id: 'dark', label: 'Dark', dark: true, swatch: ['#000000', '#ffffff', '#ffffff'] },
  { id: 'bpcg', label: 'BPCG', dark: false, swatch: ['#e6d3b3', '#3b2412', '#5a3a1c'] },
  { id: 'paper', label: 'Paper', dark: false, swatch: ['#fbf6e6', '#22304d', '#2f4a8a'], hint: 'Notebook paper with ruled lines' },
  { id: 'midnight', label: 'Midnight', dark: true, swatch: ['#0d1626', '#e4ecfa', '#7fb0ff'] },
  { id: 'forest', label: 'Forest', dark: false, swatch: ['#e8f0e2', '#1d3322', '#2f6b3f'] },
  { id: 'rose', label: 'Rose', dark: false, swatch: ['#fbeaee', '#47202c', '#b0365c'] },
];

export const themeInfo = (t: Theme): ThemeInfo => THEMES.find((x) => x.id === t) ?? THEMES[0]!;

const THEME_KEY = 'pao:theme';

/** The saved theme. Anything unknown (or no choice yet) opens in Light. */
export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (THEMES.some((t) => t.id === v)) return v as Theme;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  root.setAttribute('data-tone', themeInfo(t).dark ? 'dark' : 'light');
}

/** Light <-> Dark for the quick button at the top: from any theme, jump to the opposite tone. */
export const oppositeTheme = (t: Theme): Theme => (themeInfo(t).dark ? 'light' : 'dark');

// ---- song font ----

export type FontFace = 'inter' | 'lora' | 'mono' | 'nunito' | 'caveat' | 'serif';

export type FontInfo = { id: FontFace; label: string; family: string; note: string };

export const FONTS: FontInfo[] = [
  { id: 'inter', label: 'Inter', family: '"Inter Variable", system-ui, sans-serif', note: 'Clean and neutral (default)' },
  { id: 'nunito', label: 'Nunito', family: '"Nunito Variable", system-ui, sans-serif', note: 'Soft and rounded' },
  { id: 'lora', label: 'Lora', family: '"Lora Variable", Georgia, serif', note: 'Book-like serif' },
  { id: 'serif', label: 'Georgia', family: 'Georgia, "Times New Roman", serif', note: 'Classic system serif' },
  { id: 'mono', label: 'Mono', family: '"JetBrains Mono Variable", ui-monospace, monospace', note: 'Typewriter style, chords line up' },
  { id: 'caveat', label: 'Handwritten', family: '"Caveat Variable", cursive', note: 'Pen on a notebook page' },
];

const FONT_KEY = 'pao:fontface';
export const fontInfo = (f: FontFace): FontInfo => FONTS.find((x) => x.id === f) ?? FONTS[0]!;

export function loadFontFace(): FontFace {
  try {
    const v = localStorage.getItem(FONT_KEY);
    if (FONTS.some((f) => f.id === v)) return v as FontFace;
  } catch {
    /* storage unavailable */
  }
  return 'inter';
}

let currentFamily = FONTS[0]!.family;

/** The CSS font-family of the song text right now (used to measure text for chord alignment). */
export const songFamily = (): string => currentFamily;

export function applyFontFace(f: FontFace): void {
  currentFamily = fontInfo(f).family;
  document.documentElement.style.setProperty('--song-font', currentFamily);
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
}
