import { useState } from 'preact/hooks';
import { Icon, type IconName } from './icons';

/** Light (white and black), Dark (black and white) and BPCG (light brown and dark brown). */
export type Theme = 'light' | 'dark' | 'bpcg';
const KEY = 'pao:theme';
const ORDER: Theme[] = ['light', 'dark', 'bpcg'];

const LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', bpcg: 'BPCG' };
const ICON: Record<Theme, IconName> = { light: 'sun', dark: 'moon', bpcg: 'palette' };

/** The saved theme. Anything else (including no choice yet, or the old "match device") opens in Light. */
export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'bpcg') return v;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

export function applyTheme(t: Theme): void {
  document.documentElement.setAttribute('data-theme', t);
}

export const nextTheme = (t: Theme): Theme => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]!;
export const themeLabel = (t: Theme): string => LABEL[t];

/** One button that cycles Light -> Dark -> BPCG. `labelled` also shows the theme's name. */
export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const cycle = () => {
    const next = nextTheme(theme);
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      class={`btn ${labelled ? 'theme-pill' : 'icon ghost'}`}
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Tap to change.`}
      title={`Theme: ${LABEL[theme]}`}
    >
      <Icon name={ICON[theme]} />
      {labelled && <span>{LABEL[theme]}</span>}
    </button>
  );
}
