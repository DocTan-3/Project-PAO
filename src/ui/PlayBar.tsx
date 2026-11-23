import { Icon } from './icons';

/** Play/pause for autoscroll, the current tempo (tap to change it), and restart. */
export function PlayBar(p: {
  playing: boolean;
  finished: boolean;
  bpm: number;
  speed: number;
  onToggle: () => void;
  onRestart: () => void;
  onTempo: () => void;
}) {
  return (
    <div class="playbar" role="group" aria-label="Autoscroll">
      <button
        class={`playbtn${p.playing ? ' on' : ''}`}
        onClick={p.onToggle}
        aria-label={p.playing ? 'Pause autoscroll' : p.finished ? 'Play again' : 'Start autoscroll'}
      >
        <Icon name={p.playing ? 'pause' : 'play'} size={26} />
      </button>
      <button class="tempo-chip" onClick={p.onTempo} aria-label={`Tempo ${p.bpm} beats per minute. Tap to change.`}>
        <Icon name="timer" size={20} />
        <span class="bpm-val">{p.bpm}</span>
        <span class="bpm-unit">BPM</span>
        {p.speed !== 1 && <span class="speed-tag">{p.speed}×</span>}
      </button>
      <button class="btn icon ghost" onClick={p.onRestart} aria-label="Back to the top" title="Back to the top">
        <Icon name="restart" />
      </button>
    </div>
  );
}
