import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { type Timeline, beatAt, positionAt } from '../model/timeline';

export interface NowPlaying {
  lineId: string | null;
  chordId: string | null;
}

/** How far down the screen the current line sits while scrolling. */
const anchorPx = () => Math.max(130, Math.round(window.innerHeight * 0.3));

const lineEl = (id: string) => document.querySelector<HTMLElement>(`[data-line-id="${CSS.escape(id)}"]`);

/**
 * Teleprompter-style autoscroll that follows the song's timeline: the line being played
 * stays near the top of the screen, and the current chord is reported so it can be lit.
 * Touching or scrolling the page pauses it; pressing play resumes from where you are.
 */
export function useAutoscroll(opts: { timeline: Timeline; bpm: number; speed: number }) {
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState<NowPlaying>({ lineId: null, chordId: null });
  const tl = useRef(opts.timeline);
  const rate = useRef({ bpm: opts.bpm, speed: opts.speed });
  const beat = useRef(0);
  const raf = useRef(0);
  const last = useRef(0);
  const nowRef = useRef<NowPlaying>(now);
  tl.current = opts.timeline;
  rate.current = { bpm: opts.bpm, speed: opts.speed };

  const publish = useCallback((lineId: string | null, chordId: string | null) => {
    if (nowRef.current.lineId === lineId && nowRef.current.chordId === chordId) return;
    nowRef.current = { lineId, chordId };
    setNow(nowRef.current);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    setPlaying(false);
  }, []);

  /** The beat that matches what is currently under the reading line. */
  const beatFromScroll = useCallback((): number => {
    const t = tl.current;
    const y = window.scrollY + anchorPx();
    for (let i = 0; i < t.lines.length; i++) {
      const el = lineEl(t.lines[i]!.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      if (y < top) return i === 0 ? 0 : t.lines[i]!.start; // in a gap: start the next line
      if (y < top + r.height) return beatAt(t, i, (y - top) / Math.max(1, r.height));
    }
    return 0; // past the end: start over
  }, []);

  const frame = useCallback(
    (ts: number) => {
      const dt = Math.min(0.25, (ts - last.current) / 1000);
      last.current = ts;
      beat.current += dt * (rate.current.bpm / 60) * rate.current.speed;
      const t = tl.current;
      const pos = positionAt(t, beat.current);
      if (!pos) return stop();
      const line = t.lines[pos.lineIndex]!;
      publish(line.id, pos.chordId);
      const el = lineEl(line.id);
      if (el) {
        const r = el.getBoundingClientRect();
        const top = r.top + window.scrollY;
        window.scrollTo(0, top + pos.progress * r.height - anchorPx());
      }
      if (pos.finished) {
        setFinished(true);
        publish(null, null);
        return stop();
      }
      raf.current = requestAnimationFrame(frame);
    },
    [publish, stop],
  );

  const play = useCallback(() => {
    if (tl.current.lines.length === 0) return;
    beat.current = beatFromScroll();
    setFinished(false);
    last.current = performance.now();
    setPlaying(true);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(frame);
  }, [beatFromScroll, frame]);

  const toggle = useCallback(() => (raf.current ? stop() : play()), [play, stop]);

  const restart = useCallback(() => {
    stop();
    beat.current = 0;
    setFinished(false);
    publish(null, null);
    window.scrollTo({ top: 0 });
  }, [stop, publish]);

  // pause when the reader takes over: touching/scrolling the song, paging keys, or leaving the tab
  useEffect(() => {
    if (!playing) return;
    const inControls = (e: Event) =>
      !!(e.target as Element | null)?.closest?.('.bottom-stack, .sheet-backdrop, .topbar, .reader-side');
    const touch = (e: Event) => {
      if (!inControls(e)) stop();
    };
    const wheel = () => stop();
    const key = (e: KeyboardEvent) => {
      if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) stop();
    };
    const hidden = () => document.hidden && stop();
    addEventListener('touchstart', touch, { passive: true });
    addEventListener('pointerdown', touch, { passive: true });
    addEventListener('wheel', wheel, { passive: true });
    addEventListener('keydown', key);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      removeEventListener('touchstart', touch);
      removeEventListener('pointerdown', touch);
      removeEventListener('wheel', wheel);
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

  return { playing, finished, now, toggle, play, stop, restart };
}
