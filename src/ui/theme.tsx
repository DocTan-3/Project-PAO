import { useState } from 'preact/hooks';
import { applyLook, loadMode, loadPalette, otherMode, saveMode } from './appearance';
import { Icon } from './icons';

/**
 * The quick button at the top right: an icon only. It flips the chosen colour palette between its
 * Day look (sun) and its darker Night look (sparkles). The palette itself is picked in Settings.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState(loadMode);
  const flip = () => {
    const next = otherMode(mode);
    setMode(next);
    applyLook(loadPalette(), next);
    saveMode(next);
  };
  return (
    <button
      class="btn icon ghost"
      onClick={flip}
      aria-label={mode === 'night' ? 'Switch to Day' : 'Switch to Night'}
      title={mode === 'night' ? 'Night' : 'Day'}
    >
      <Icon name={mode === 'night' ? 'sparkles' : 'sun'} />
    </button>
  );
}
