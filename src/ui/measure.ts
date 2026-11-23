/** Text measurement via canvas, matching the CSS font used to render. */
export function makeMeasure(font: string): (s: string) => number {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = font;
  return (s) => ctx.measureText(s).width;
}
