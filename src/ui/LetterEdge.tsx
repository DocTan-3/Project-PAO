import { useRef, useState } from 'preact/hooks';

/**
 * Jump to a letter fast. A thin grip sits in the right edge of the screen so the list stays clean. Press it and a tall
 * strip of letters opens: slide your finger to a letter and the list follows, with a big letter in the middle. Lift to stay there.
 * Each letter is also a real button, so the keyboard and screen readers can use it.
 */
export function LetterEdge({
  letters,
  onJump,
  currentLetter,
}: {
  letters: string[];
  onJump: (letter: string) => void;
  /** the letter whose songs are at the top of the screen right now (marked when the strip opens) */
  currentLetter: () => string | null;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [cur, setCur] = useState<string | null>(null);

  /** the letter button nearest to the finger */
  const at = (y: number): string | null => {
    const btns = [...(zone.current?.querySelectorAll<HTMLButtonElement>('[data-letter]') ?? [])];
    let best: string | null = null;
    let bd = Infinity;
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const d = Math.abs(y - (r.top + r.height / 2));
      if (d < bd) {
        bd = d;
        best = b.dataset.letter ?? null;
      }
    }
    return best;
  };
  const go = (y: number) => {
    const l = at(y);
    if (!l) return;
    setLetter(l);
    onJump(l);
  };

  return (
    <div
      ref={zone}
      class={`letter-edge${on ? ' on' : ''}`}
      id="letter-edge"
      role="group"
      aria-label="Jump to letter"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setCur(currentLetter());
        setOn(true);
        go(e.clientY);
      }}
      onPointerMove={(e) => on && go(e.clientY)}
      onPointerUp={() => {
        setOn(false);
        setLetter(null);
      }}
      onPointerCancel={() => {
        setOn(false);
        setLetter(null);
      }}
    >
      <span class="grip" aria-hidden="true" />
      <div class="edge-rail">
        {letters.map((l) => (
          <button
            type="button"
            key={l}
            data-letter={l}
            class={l === (letter ?? cur) ? 'cur' : ''}
            aria-label={`Jump to ${l}`}
            onClick={() => onJump(l)}
          >
            {l}
          </button>
        ))}
      </div>
      {letter && <div class="edge-bubble" aria-hidden="true">{letter}</div>}
    </div>
  );
}
