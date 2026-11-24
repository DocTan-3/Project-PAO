/**
 * The app logo: a cross rising into a figure with a purple and a pink figure beside it, and a few sparkles.
 * Drawn in a 512 x 512 space; the colours fade slightly towards the bottom. Meant to sit on a black ground.
 */
const GAP = '#000000';
const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="BPCG - PAW logo">
      <defs>
        {(
          [
            ['logo-l', '#9b6bff'],
            ['logo-m', '#4aa8ff'],
            ['logo-r', '#ff6fb0'],
          ] as const
        ).map(([id, c]) => (
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1" key={id}>
            <stop offset="0" stop-color={c} />
            <stop offset="1" stop-color={c} stop-opacity=".62" />
          </linearGradient>
        ))}
      </defs>
      <rect width="512" height="512" fill={GAP} />
      <g transform="translate(256 268) scale(.44) translate(-547 -495)">
        <g stroke={GAP} stroke-width="14" paint-order="stroke" stroke-linejoin="round">
          <path fill="url(#logo-l)" d="M170 632C215 735 335 720 402 604C410 720 430 835 470 925C320 885 190 765 170 632Z" />
          <circle fill="url(#logo-l)" cx="285" cy="605" r="52" stroke="none" />
          <path fill="url(#logo-r)" d="M668 598C700 655 745 698 805 702C865 706 905 695 925 680C892 818 745 912 555 940C605 810 645 705 668 598Z" />
          <circle fill="url(#logo-r)" cx="815" cy="632" r="50" stroke="none" />
          <path fill="url(#logo-m)" d="M585 48C550 118 520 180 506 245C484 350 484 460 500 560C512 650 560 702 600 692C640 682 655 622 662 592C650 760 590 880 512 945C450 880 415 760 418 640C418 480 432 340 474 225C512 140 556 90 585 48Z" />
          <circle fill="url(#logo-m)" cx="560" cy="596" r="62" />
          <path fill="url(#logo-m)" stroke="none" d="M318 190C440 150 620 165 695 268C600 205 440 190 318 190Z" />
        </g>
      </g>
      <path fill="#ffffff" d={sparkle(382, 74, 34)} />
      <path fill="#ffd0ea" d={sparkle(436, 126, 16) + sparkle(90, 118, 18)} />
    </svg>
  );
}
