import { useEffect, useState } from 'preact/hooks';
import { songFamily } from './appearance';

export { loadFontPx, saveFontPx } from './appearance';

/** True once the song font's faces are loaded, so canvas measurements match the rendered text. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const family = songFamily();
    document.fonts
      .load(`400 16px ${family}`)
      .then(() => document.fonts.load(`700 16px ${family}`))
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
