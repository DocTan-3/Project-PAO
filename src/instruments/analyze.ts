import { type Chord } from '../theory/chord';
import { pitchClass } from '../theory/note';

/** One note of a chord. */
export interface Tone {
  /** pitch class 0-11 */
  pc: number;
  /** semitones above the root, 0-23 (9th = 14, 13th = 21, ...) used for stacking voicings */
  semis: number;
  /** a voicing must contain it for the chord to be recognisable */
  required: boolean;
}

export interface ChordTones {
  rootPc: number;
  bassPc: number;
  /** ordered by semis, one entry per distinct pitch class */
  tones: Tone[];
  /** chord has a 9th/11th/13th (so the 5th is usually dropped) */
  extended: boolean;
}

const TOKEN =
  /^(maj|M(?=\d)|min|m|-|dim|°|ø|aug|\+|sus2|sus4|sus|add13|add11|add9|no3|no5|6\/9|13|11|9|7|6|5|[#b](?:5|9|11|13))/;

/**
 * Work out which notes a chord is made of, from its suffix:
 * "m7b5" -> root, b3, b5, b7. Returns null for suffixes it does not understand
 * (the UI then says "no diagram" instead of showing a wrong one).
 */
export function analyzeChord(chord: Chord): ChordTones | null {
  const rootPc = pitchClass(chord.root);
  const bassPc = chord.bass ? pitchClass(chord.bass) : rootPc;

  let q: 'M' | 'm' | 'dim' | 'aug' = 'M';
  let maj7 = false;
  let half = false;
  let sus: 2 | 4 | null = null;
  let ext = 0;
  let six = false;
  let power = false;
  let noThird = false;
  let noFifth = false;
  const adds = new Set<number>(); // semis above root, compound
  const alts = new Set<string>();

  let rest = chord.suffix.replace(/[(),\s]/g, '');
  while (rest.length > 0) {
    const m = TOKEN.exec(rest);
    if (!m) return null;
    const t = m[1]!;
    rest = rest.slice(t.length);
    switch (t) {
      case 'maj': case 'M': maj7 = true; break;
      case 'min': case 'm': case '-': q = 'm'; break;
      case 'dim': case '°': q = 'dim'; break;
      case 'ø': q = 'dim'; half = true; break;
      case 'aug': case '+': q = 'aug'; break;
      case 'sus2': sus = 2; break;
      case 'sus4': case 'sus': sus = 4; break;
      case 'add9': adds.add(14); break;
      case 'add11': adds.add(17); break;
      case 'add13': adds.add(21); break;
      case 'no3': noThird = true; break;
      case 'no5': noFifth = true; break;
      case '6/9': six = true; adds.add(14); break;
      case '6': six = true; break;
      case '7': case '9': case '11': case '13': ext = Math.max(ext, Number(t)); break;
      case '5': power = true; break;
      default: alts.add(t); // #5 b5 b9 #9 #11 b13
    }
  }
  if (half && ext === 0) ext = 7;

  const map = new Map<number, boolean>(); // semis -> required
  const put = (semis: number, required: boolean) => {
    const pcSemis = [...map.keys()].find((k) => k % 12 === semis % 12);
    if (pcSemis !== undefined) {
      if (required) map.set(pcSemis, true);
      return;
    }
    map.set(semis, required);
  };

  put(0, true);
  if (power && ext === 0 && !sus && !six && adds.size === 0) {
    put(7, true);
  } else {
    if (sus) put(sus === 2 ? 2 : 5, true);
    else if (!noThird) put(q === 'M' || q === 'aug' ? 4 : 3, ext !== 11);

    if (!noFifth) {
      let fifth = q === 'dim' ? 6 : q === 'aug' ? 8 : 7;
      if (alts.has('b5')) fifth = 6;
      if (alts.has('#5')) fifth = 8;
      put(fifth, q === 'dim' || q === 'aug' || alts.has('b5') || alts.has('#5'));
    }
    if (ext >= 7) put(q === 'dim' && !half ? 9 : maj7 ? 11 : 10, true);
    if (six && ext < 7) put(9, true);
    if (ext >= 9) put(14, ext === 9);
    if (ext >= 11) put(17, ext === 11);
    if (ext >= 13) put(21, true);
    for (const a of adds) put(a, true);
    if (alts.has('b9')) put(13, true);
    if (alts.has('#9')) put(15, true);
    if (alts.has('#11')) put(18, true);
    if (alts.has('b13')) put(20, true);
  }

  const tones: Tone[] = [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([semis, required]) => ({ pc: (rootPc + semis) % 12, semis, required }));
  // a slash bass outside the chord is an extra required note
  if (!tones.some((t) => t.pc === bassPc)) tones.push({ pc: bassPc, semis: -1, required: true });
  return { rootPc, bassPc, tones, extended: ext >= 9 };
}
