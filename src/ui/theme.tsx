import { useState } from 'preact/hooks';
import { applyTheme, loadTheme, oppositeTheme, saveTheme, themeInfo } from './appearance';
import { Icon } from './icons';

/**
 * The quick button at the top right: an icon only. It flips between a light and a dark look
 * (the sun shows on a light theme, the moon on a dark one). The full choice of colours is in Settings.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState(loadTheme);
  const flip = () => {
    const next = oppositeTheme(theme);
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };
  const dark = themeInfo(theme).dark;
  return (
    <button
      class="btn icon ghost"
      onClick={flip}
      aria-label={dark ? 'Switch to a light theme' : 'Switch to a dark theme'}
      title={`Theme: ${themeInfo(theme).label}`}
    >
      <Icon name={dark ? 'moon' : 'sun'} />
    </button>
  );
}
