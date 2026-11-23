import type { FretVoicing } from '../instruments';

const W = 100;
const LEFT = 22;
const RIGHT = 84;
const TOP = 28;
const ROWS = 5;
const ROW_H = 18;
const H = TOP + ROWS * ROW_H + 8;

/** A guitar/ukulele chord box: nut, strings, frets, finger dots, barre, open and muted markers. */
export function FretDiagram({ voicing, width = 120, label }: { voicing: FretVoicing; width?: number; label?: string }) {
  const n = voicing.frets.length;
  const gap = (RIGHT - LEFT) / (n - 1);
  const sx = (i: number) => LEFT + i * gap;
  const rowY = (row: number) => TOP + (row + 0.5) * ROW_H;
  const b = voicing.barre;

  return (
    <svg
      class="fd"
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      role="img"
      aria-label={label ?? 'Chord diagram'}
    >
      {/* frets */}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <line key={`f${r}`} x1={LEFT} x2={RIGHT} y1={TOP + r * ROW_H} y2={TOP + r * ROW_H} class="fd-line" />
      ))}
      {/* nut, or the fret number when the hand is up the neck */}
      {voicing.baseFret === 1 ? (
        <rect x={LEFT - 1} y={TOP - 3} width={RIGHT - LEFT + 2} height={4} class="fd-nut" />
      ) : (
        <text x={LEFT - 6} y={rowY(0) + 4} text-anchor="end" class="fd-fret">
          {voicing.baseFret}
        </text>
      )}
      {/* strings */}
      {Array.from({ length: n }, (_, i) => (
        <line key={`s${i}`} x1={sx(i)} x2={sx(i)} y1={TOP} y2={TOP + ROWS * ROW_H} class="fd-line" />
      ))}
      {/* barre */}
      {b && b.to > b.from && (
        <rect
          x={sx(b.from) - 6}
          y={rowY(b.fret - voicing.baseFret) - 6}
          width={sx(b.to) - sx(b.from) + 12}
          height={12}
          rx={6}
          class="fd-dot"
        />
      )}
      {/* open / muted / fingered */}
      {voicing.frets.map((f, i) =>
        f < 0 ? (
          <g key={`m${i}`} class="fd-mark">
            <line x1={sx(i) - 3.5} y1={11.5} x2={sx(i) + 3.5} y2={18.5} />
            <line x1={sx(i) + 3.5} y1={11.5} x2={sx(i) - 3.5} y2={18.5} />
          </g>
        ) : f === 0 ? (
          <circle key={`o${i}`} cx={sx(i)} cy={15} r={3.6} class="fd-open" />
        ) : (
          <circle key={`d${i}`} cx={sx(i)} cy={rowY(f - voicing.baseFret)} r={6} class="fd-dot" />
        ),
      )}
    </svg>
  );
}
