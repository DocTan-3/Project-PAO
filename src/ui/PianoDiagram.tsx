const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // pc -> index of the white key to its left
const KW = 14; // white key width
const KH = 64;
const BH = 40;
const BW = 9;

/** A keyboard with the chord's notes lit. `names` maps a pitch class to the label drawn on a lit key. */
export function PianoDiagram({
  notes,
  rootMidi,
  names,
  width = 220,
  label,
}: {
  notes: number[];
  rootMidi: number;
  names: (pc: number) => string;
  width?: number;
  label?: string;
}) {
  const lo = Math.floor(Math.min(...notes) / 12) * 12;
  let hi = Math.ceil((Math.max(...notes) + 1) / 12) * 12;
  while (hi - lo < 24) hi += 12;
  const octaves = (hi - lo) / 12;
  const whites = octaves * 7;
  const total = whites * KW + 2;
  const lit = new Set(notes);

  const whiteKeys: { midi: number; x: number }[] = [];
  const blackKeys: { midi: number; x: number }[] = [];
  for (let o = 0; o < octaves; o++) {
    WHITE.forEach((pc, i) => whiteKeys.push({ midi: lo + o * 12 + pc, x: 1 + (o * 7 + i) * KW }));
    for (const [pcStr, left] of Object.entries(BLACK)) {
      const pc = Number(pcStr);
      blackKeys.push({ midi: lo + o * 12 + pc, x: 1 + (o * 7 + left) * KW + KW - BW / 2 });
    }
  }

  return (
    <svg
      class="pd"
      viewBox={`0 0 ${total} ${KH + 2}`}
      width={width}
      height={(width * (KH + 2)) / total}
      role="img"
      aria-label={label ?? 'Piano chord'}
    >
      {whiteKeys.map((k) => (
        <g key={`w${k.midi}`}>
          <rect x={k.x} y={1} width={KW} height={KH} class={`pd-white${lit.has(k.midi) ? ' on' : ''}${k.midi === rootMidi ? ' root' : ''}`} />
          {lit.has(k.midi) && (
            <text x={k.x + KW / 2} y={KH - 6} text-anchor="middle" class="pd-name">
              {names(k.midi % 12)}
            </text>
          )}
        </g>
      ))}
      {blackKeys.map((k) => (
        <g key={`b${k.midi}`}>
          <rect x={k.x} y={1} width={BW} height={BH} rx={1.5} class={`pd-black${lit.has(k.midi) ? ' on' : ''}${k.midi === rootMidi ? ' root' : ''}`} />
          {lit.has(k.midi) && (
            <text x={k.x + BW / 2} y={BH - 5} text-anchor="middle" class="pd-name-b">
              {names(k.midi % 12)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
