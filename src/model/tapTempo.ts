export const MIN_BPM = 30;
export const MAX_BPM = 300;
/** A pause longer than this starts a fresh count. */
export const TAP_RESET_MS = 2500;
const KEEP = 8;

export const clampBpm = (n: number): number => Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));

/** Add a tap (timestamp in ms) to the list, starting over after a long pause. */
export function addTap(taps: readonly number[], now: number): number[] {
  const last = taps[taps.length - 1];
  const fresh = last !== undefined && now - last > TAP_RESET_MS ? [] : [...taps];
  fresh.push(now);
  return fresh.slice(-KEEP);
}

/** Tempo from tap timestamps: the average gap between taps. Needs at least two taps. */
export function bpmFromTaps(taps: readonly number[]): number | null {
  if (taps.length < 2) return null;
  const span = taps[taps.length - 1]! - taps[0]!;
  if (span <= 0) return null;
  const avgMs = span / (taps.length - 1);
  return clampBpm(60000 / avgMs);
}
