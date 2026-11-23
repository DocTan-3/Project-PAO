import { useEffect, useRef } from 'preact/hooks';

export type SwipeDir = 'next' | 'prev';

// The direction of the last navigation, so the page that appears can slide in from the right side.
let pending: SwipeDir | null = null;
export const rememberDirection = (d: SwipeDir): void => {
  pending = d;
};
export const takeDirection = (): SwipeDir | null => {
  const d = pending;
  pending = null;
  return d;
};

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Options {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** a swipe was made towards a side with no song */
  onEdge: (dir: SwipeDir) => void;
  disabled?: boolean;
}

/**
 * Swipe left/right on an element to go to the next/previous item. The element follows the finger,
 * vertical scrolling is untouched, and a mouse never swipes (use the arrow keys or the buttons).
 * Left/right arrow keys do the same.
 */
export function useSwipeNav(ref: { current: HTMLElement | null }, options: Options): void {
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let mode: 'idle' | 'scroll' | 'swipe' = 'idle';
    let startX = 0;
    let startY = 0;
    let startT = 0;
    let id = -1;

    const reset = (animate: boolean) => {
      el.style.transition = animate ? 'transform .18s ease-out, opacity .18s' : '';
      el.style.transform = '';
      el.style.opacity = '';
      if (animate) setTimeout(() => (el.style.transition = ''), 200);
    };

    const down = (e: PointerEvent) => {
      if (opts.current.disabled || e.pointerType === 'mouse' || !e.isPrimary) return;
      if ((e.target as Element).closest('input, textarea, select, [data-noswipe]')) return;
      mode = 'idle';
      startX = e.clientX;
      startY = e.clientY;
      startT = performance.now();
      id = e.pointerId;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== id || mode === 'scroll') return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (mode === 'idle') {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          mode = 'scroll';
          return;
        }
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          mode = 'swipe';
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        } else return;
      }
      const o = opts.current;
      const blocked = (dx < 0 && !o.canNext) || (dx > 0 && !o.canPrev);
      const x = dx * (blocked ? 0.18 : 0.7);
      el.style.transition = '';
      el.style.transform = `translateX(${x}px)`;
      el.style.opacity = String(1 - Math.min(Math.abs(x) / 420, 0.4));
    };

    const finish = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (mode !== 'swipe') {
        mode = 'idle';
        return;
      }
      mode = 'idle';
      const dx = e.clientX - startX;
      const speed = Math.abs(dx) / Math.max(1, performance.now() - startT); // px per ms
      const far = Math.abs(dx) > Math.max(70, el.clientWidth * 0.2) || (speed > 0.5 && Math.abs(dx) > 40);
      // the click that ends a swipe must not press a chord underneath
      const swallow = (ev: Event) => ev.stopPropagation();
      el.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 80);

      const o = opts.current;
      const dir: SwipeDir = dx < 0 ? 'next' : 'prev';
      const can = dir === 'next' ? o.canNext : o.canPrev;
      if (!far) return reset(true);
      if (!can) {
        reset(true);
        o.onEdge(dir);
        return;
      }
      const go = dir === 'next' ? o.onNext : o.onPrev;
      if (reduceMotion()) return go();
      el.style.transition = 'transform .16s ease-in, opacity .16s';
      el.style.transform = `translateX(${dx < 0 ? '-' : ''}${window.innerWidth}px)`;
      el.style.opacity = '0';
      setTimeout(go, 150);
    };

    el.addEventListener('pointerdown', down, { passive: true });
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', (e) => {
      if (e.pointerId === id) {
        id = -1;
        if (mode === 'swipe') reset(true);
        mode = 'idle';
      }
    });

    const key = (e: KeyboardEvent) => {
      const o = opts.current;
      if (o.disabled || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if ((e.target as Element | null)?.closest?.('input, textarea, select, [role=dialog]')) return;
      if (e.key === 'ArrowRight') o.canNext ? o.onNext() : o.onEdge('next');
      else if (e.key === 'ArrowLeft') o.canPrev ? o.onPrev() : o.onEdge('prev');
    };
    addEventListener('keydown', key);

    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', finish);
      removeEventListener('keydown', key);
      reset(false);
    };
  }, [ref]);
}
