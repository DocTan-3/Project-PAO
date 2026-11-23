import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

/** Scroll speed in pixels per second for each level (1-10), for 18px text. Bigger text scrolls faster so lines pass at the same pace. */
export const SPEED_LEVELS = [6, 9, 12, 16, 20, 26, 33, 42, 54, 70];
export const DEFAULT_SPEED = 4;
export const MAX_SPEED = SPEED_LEVELS.length;

export function loadSpeed(): number {
  try {
    const n = Number(localStorage.getItem('pao:speed'));
    if (Number.isInteger(n) && n >= 1 && n <= MAX_SPEED) return n;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SPEED;
}
export function saveSpeed(n: number): void {
  try {
    localStorage.setItem('pao:speed', String(n));
  } catch {
    /* ignore */
  }
}

/**
 * Plain autoscroll: the page moves steadily down at the chosen speed. Touching or scrolling the page pauses it,
 * and pressing play again carries on from wherever the reader is. Stops at the end of the song.
 */
export function useAutoscroll(opts: { speed: number; fontPx: number }) {
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const rate = useRef(0);
  const raf = useRef(0);
  const last = useRef(0);
  const pos = useRef(0);
  rate.current = SPEED_LEVELS[Math.max(1, Math.min(MAX_SPEED, opts.speed)) - 1]! * (opts.fontPx / 18);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    setPlaying(false);
  }, []);

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const frame = useCallback(
    (ts: number) => {
      const dt = Math.min(0.25, (ts - last.current) / 1000);
      last.current = ts;
      // if something else moved the page (a flick that is still gliding, the scrollbar), carry on from there
      if (Math.abs(window.scrollY - pos.current) > 3) pos.current = window.scrollY;
      pos.current += rate.current * dt;
      const max = maxScroll();
      if (pos.current >= max) {
        window.scrollTo(0, max);
        setFinished(true);
        return stop();
      }
      window.scrollTo(0, pos.current);
      raf.current = requestAnimationFrame(frame);
    },
    [stop],
  );

  const play = useCallback(() => {
    if (maxScroll() <= 0) return; // a song that fits on the screen has nothing to scroll
    pos.current = window.scrollY;
    if (maxScroll() - pos.current < 4) {
      // already at the end: start again from the top
      window.scrollTo(0, 0);
      pos.current = 0;
    }
    setFinished(false);
    last.current = performance.now();
    setPlaying(true);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  const toggle = useCallback(() => (raf.current ? stop() : play()), [play, stop]);

  const restart = useCallback(() => {
    stop();
    pos.current = 0;
    setFinished(false);
    window.scrollTo({ top: 0 });
  }, [stop]);

  // pause when the reader takes over: touching/scrolling the song, paging keys, or leaving the tab
  useEffect(() => {
    if (!playing) return;
    const inControls = (e: Event) => !!(e.target as Element | null)?.closest?.('.reader-head, .sheet-backdrop, .reader-side');
    const touch = (e: Event) => {
      if (!inControls(e)) stop();
    };
    const key = (e: KeyboardEvent) => {
      if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) stop();
    };
    const hidden = () => document.hidden && stop();
    addEventListener('touchstart', touch, { passive: true });
    addEventListener('pointerdown', touch, { passive: true });
    addEventListener('wheel', stop, { passive: true });
    addEventListener('keydown', key);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      removeEventListener('touchstart', touch);
      removeEventListener('pointerdown', touch);
      removeEventListener('wheel', stop);
      removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [playing, stop]);

  // space bar toggles play when not typing
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== 'Space' || el?.closest('input, textarea, select, button, [role=dialog]')) return;
      e.preventDefault();
      toggle();
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [toggle]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { playing, finished, toggle, stop, restart };
}
