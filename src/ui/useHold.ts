import { useRef, useState } from 'preact/hooks';

/**
 * Press-and-hold on a list item. Spread `bind(id)` onto the element. A hold calls `onHold(id)`;
 * scrolling or dragging cancels it; and the click that ends a hold is swallowed by `consumeClick()`.
 */
export function useHold(onHold: (id: string) => void, ms = 550) {
  const [pressing, setPressing] = useState<string | null>(null);
  const timer = useRef(0);
  const held = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  const cancel = () => {
    clearTimeout(timer.current);
    setPressing(null);
  };

  const bind = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      held.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      setPressing(id);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        held.current = true;
        setPressing(null);
        try {
          navigator.vibrate?.(30);
        } catch {
          /* not supported */
        }
        onHold(id);
      }, ms);
    },
    onPointerMove: (e: PointerEvent) => {
      if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: Event) => e.preventDefault(),
  });

  /** True (once) when the click that follows is just the end of a hold and must not open the item. */
  const consumeClick = (): boolean => {
    if (held.current) {
      held.current = false;
      return true;
    }
    return false;
  };

  return { pressing, bind, consumeClick };
}
