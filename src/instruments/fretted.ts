import type { Chord } from '../theory/chord';
import { type ChordTones, analyzeChord } from './analyze';

export type FrettedInstrument = 'guitar' | 'ukulele';

/** MIDI note of each open string, in the order they are drawn (left to right). */
export const TUNINGS: Record<FrettedInstrument, number[]> = {
  guitar: [40, 45, 50, 55, 59, 64], // E A D G B E
  ukulele: [67, 60, 64, 69], // G C E A (re-entrant)
};

export interface FretVoicing {
  /** fret per string in drawing order; -1 = muted, 0 = open */
  frets: number[];
  /** fret number of the top row of the diagram (1 = shows the nut) */
  baseFret: number;
  barre: { fret: number; from: number; to: number } | null;
  fingers: number;
  /** ranking score, lower is better (exposed for tests) */
  score: number;
}

const WINDOW = 4; // frets reachable without moving the hand
const MAX_FRET = 15;

interface Candidate {
  frets: number[];
  score: number;
  minFret: number;
}

/** The fret-wide finger lying across several strings, when the shape really needs one. */
function barreOf(frets: number[]): { fret: number; from: number; to: number } | null {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length < 2) return null;
  const f = Math.min(...fretted);
  const idx = frets.map((v, i) => (v === f ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return null;
  const from = idx[0]!;
  const to = idx[idx.length - 1]!;
  for (let i = from; i <= to; i++) if (frets[i]! < f) return null; // an open or muted string breaks the barre
  // Two or three neighbouring notes on one fret are just separate fingers (Em, A). A barre is
  // drawn when one finger spans four or more strings, or when it is needed to stay within four fingers.
  if (to - from < 3 && fretted.length <= 4) return null;
  return { fret: f, from, to };
}

function fingerCount(frets: number[]): number {
  const b = barreOf(frets);
  const fretted = frets.filter((f) => f > 0);
  if (!b) return fretted.length;
  return 1 + frets.filter((f) => f > b.fret).length;
}

/** Search every playable shape within one hand position, then rank them. */
function search(t: ChordTones, instrument: FrettedInstrument): Candidate[] {
  const tuning = TUNINGS[instrument];
  const n = tuning.length;
  const allowed = new Set(t.tones.map((x) => x.pc));
  const required = t.tones.filter((x) => x.required).map((x) => x.pc);
  const fifthPc = t.tones.find((x) => x.semis % 12 === 7 || x.semis % 12 === 6 || x.semis % 12 === 8)?.pc;
  const slash = t.bassPc !== t.rootPc;
  const minNotes = Math.min(instrument === 'guitar' ? 4 : 3, t.tones.length);
  const seen = new Set<string>();
  const out: Candidate[] = [];

  for (let w = 1; w <= MAX_FRET - WINDOW + 1; w++) {
    const opts: number[][] = tuning.map((open) => {
      const o = [-1];
      if (w <= 4 && allowed.has(open % 12)) o.push(0);
      for (let f = w; f < w + WINDOW; f++) if (allowed.has((open + f) % 12)) o.push(f);
      return o;
    });
    const cur: number[] = new Array(n).fill(-1);
    const rec = (i: number) => {
      if (i === n) {
        const key = cur.join(',');
        if (seen.has(key)) return;
        const c = evaluate(cur);
        if (c) {
          seen.add(key);
          out.push(c);
        }
        return;
      }
      for (const f of opts[i]!) {
        cur[i] = f;
        rec(i + 1);
      }
    };
    rec(0);
  }

  function evaluate(frets: number[]): Candidate | null {
    const sounding = frets.map((f, i) => (f >= 0 ? i : -1)).filter((i) => i >= 0);
    if (sounding.length < minNotes) return null;
    const first = sounding[0]!;
    const last = sounding[sounding.length - 1]!;
    for (let i = first; i <= last; i++) if (frets[i]! < 0) return null; // no muted string in the middle
    const midi = sounding.map((i) => tuning[i]! + frets[i]!);
    const pcs = new Set(midi.map((m) => m % 12));
    for (const r of required) if (!pcs.has(r)) return null;
    const lowest = Math.min(...midi);
    if ((instrument === 'guitar' || slash) && lowest % 12 !== t.bassPc) return null;
    const fretted = frets.filter((f) => f > 0);
    const minF = fretted.length ? Math.min(...fretted) : 0;
    const maxF = fretted.length ? Math.max(...fretted) : 0;
    if (maxF - minF > WINDOW - 1) return null;
    const opens = frets.filter((f) => f === 0).length;
    if (opens > 0 && maxF > 5) return null; // open strings only make sense near the nut
    const fingers = fingerCount(frets);
    if (fingers > 4) return null;

    const muted = n - sounding.length;
    let score = 0;
    score += Math.max(0, fingers - 1) * 0.5; // no bonus for shapes that need no fingers at all
    score += minF * 0.5;
    score += (maxF - minF) * 0.5;
    // a muted string costs more on a four-string instrument, where it is a quarter of the chord
    score += muted * (n <= 4 ? 1.6 : 0.9);
    score -= opens * 0.4;
    score -= sounding.length * 0.5;
    if (opens > 0 && maxF >= 4) score += 2; // an open string next to a stretched hand is awkward
    if (fifthPc !== undefined && !pcs.has(fifthPc) && !t.extended) score += 0.8;
    // thicker voicings that skip the very lowest strings are fine; leaving the root off the bass is not
    return { frets: frets.slice(), score, minFret: minF };
  }

  return out.sort((a, b) => a.score - b.score || a.minFret - b.minFret);
}

const cache = new Map<string, FretVoicing[]>();

/** Up to `limit` distinct playable voicings, best first. Empty if the chord is not understood. */
export function frettedVoicings(chord: Chord, instrument: FrettedInstrument, limit = 4): FretVoicing[] {
  const t = analyzeChord(chord);
  if (!t) return [];
  const key = `${instrument}|${t.rootPc}|${t.bassPc}|${t.tones.map((x) => `${x.pc}${x.required ? '!' : ''}`).join('.')}`;
  const hit = cache.get(key);
  if (hit) return hit.slice(0, limit);

  const ranked = search(t, instrument);
  const picked: Candidate[] = [];
  for (const c of ranked) {
    // keep variety: another shape must sit at least 3 frets away from those already chosen
    if (picked.every((p) => Math.abs(p.minFret - c.minFret) >= 3)) picked.push(c);
    if (picked.length >= 5) break;
  }
  const voicings = picked.map((c): FretVoicing => {
    const fretted = c.frets.filter((f) => f > 0);
    const maxF = fretted.length ? Math.max(...fretted) : 0;
    const baseFret = maxF <= 5 ? 1 : Math.min(...fretted);
    return { frets: c.frets, baseFret, barre: barreOf(c.frets), fingers: fingerCount(c.frets), score: c.score };
  });
  cache.set(key, voicings);
  return voicings.slice(0, limit);
}
