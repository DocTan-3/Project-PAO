import { useState } from 'preact/hooks';
import { Icon, type IconName } from './icons';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'pao:theme';
let applied = false; // whether we have set data-theme ourselves (so "system" only undoes our own change)

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  if (t === 'system') {
    if (applied) root.removeAttribute('data-theme');
    applied = false;
  } else {
    root.setAttribute('data-theme', t);
    applied = true;
  }
}

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const ICON: Record<Theme, IconName> = { system: 'auto', light: 'sun', dark: 'moon' };
const LABEL: Record<Theme, string> = { system: 'Match device', light: 'Light', dark: 'Dark' };

/** One button that cycles Match device -> Light -> Dark. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const cycle = () => {
    const next = NEXT[theme];
    setTheme(next);
    applyTheme(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      class="btn icon ghost"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Tap to change.`}
      title={`Theme: ${LABEL[theme]}`}
    >
      <Icon name={ICON[theme]} />
    </button>
  );
}
