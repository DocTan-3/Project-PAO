import { useEffect, useState } from 'preact/hooks';

export const FONT_FAMILY = '"Inter Variable", system-ui, sans-serif';

/** True once the Inter faces are loaded, so canvas measurements match the rendered text. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts
      .load(`400 16px ${FONT_FAMILY}`)
      .then(() => document.fonts.load(`700 16px ${FONT_FAMILY}`))
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

export function loadFontPx(): number {
  try {
    return Number(localStorage.getItem('pao:font')) || 18;
  } catch {
    return 18;
  }
}
export function saveFontPx(n: number): void {
  try {
    localStorage.setItem('pao:font', String(n));
  } catch {
    /* ignore */
  }
}
