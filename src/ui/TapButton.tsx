import { useRef, useState } from 'preact/hooks';
import { addTap, bpmFromTaps } from '../model/tapTempo';

/**
 * Tap along with the beat. Each tap updates the tempo from the average gap between recent taps;
 * a pause of a couple of seconds starts a new count. Fires on pointer-down so it keeps up with fast taps.
 */
export function TapButton({ onBpm, big = false }: { onBpm: (bpm: number) => void; big?: boolean }) {
  const taps = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(0);

  const tap = () => {
    taps.current = addTap(taps.current, performance.now());
    setCount(taps.current.length);
    setPulse((p) => p + 1);
    const bpm = bpmFromTaps(taps.current);
    if (bpm !== null) onBpm(bpm);
  };

  return (
    <button
      type="button"
      class={`tap${big ? ' big' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        tap();
      }}
      onClick={(e) => {
        if (e.detail === 0) tap(); // keyboard activation (Enter / Space)
      }}
      aria-label="Tap to set the tempo"
    >
      <span key={pulse} class="tap-ring" aria-hidden="true" />
      <span class="tap-label">{count < 2 ? 'Tap tempo' : `${count} taps`}</span>
      {big && <span class="tap-sub">{count === 0 ? 'Tap along with the beat' : count === 1 ? 'Keep tapping' : 'Pause to start over'}</span>}
    </button>
  );
}
