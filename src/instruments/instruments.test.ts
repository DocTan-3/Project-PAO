import { describe, expect, it } from 'vitest';
import { formatChord, parseChord, spellPitchClass } from '../theory';
import { analyzeChord } from './analyze';
import { TUNINGS, type FrettedInstrument, frettedVoicings } from './fretted';
import { pianoVoicings } from './piano';

const chord = (s: string) => {
  const c = parseChord(s);
  if (!c) throw new Error(`bad chord ${s}`);
  return c;
};
const shape = (f: number[]) => f.map((x) => (x < 0 ? 'x' : x)).join(f.some((x) => x > 9) ? '-' : '');
const pcs = (s: string) =>
  analyzeChord(chord(s))!.tones.filter((t) => t.semis >= 0).map((t) => t.pc).sort((a, b) => a - b);

describe('analyzeChord', () => {
  it('spells out triads and sevenths', () => {
    expect(pcs('C')).toEqual([0, 4, 7]);
    expect(pcs('Am')).toEqual([0, 4, 9]);
    expect(pcs('Cmaj7')).toEqual([0, 4, 7, 11]);
    expect(pcs('G7')).toEqual([2, 5, 7, 11]);
    expect(pcs('Bm7b5')).toEqual([2, 5, 9, 11]);
    expect(pcs('Bdim7')).toEqual([2, 5, 8, 11]);
    expect(pcs('Caug')).toEqual([0, 4, 8]);
  });
  it('handles suspensions, sixths, adds and extensions', () => {
    expect(pcs('Csus4')).toEqual([0, 5, 7]);
    expect(pcs('Csus2')).toEqual([0, 2, 7]);
    expect(pcs('C6')).toEqual([0, 4, 7, 9]);
    expect(pcs('C6/9')).toEqual([0, 2, 4, 7, 9]);
    expect(pcs('Cadd9')).toEqual([0, 2, 4, 7]);
    expect(pcs('Cmadd9')).toEqual([0, 2, 3, 7]);
    expect(pcs('C7sus4')).toEqual([0, 5, 7, 10]);
    expect(pcs('C9')).toEqual([0, 2, 4, 7, 10]);
    expect(pcs('Cmaj9')).toEqual([0, 2, 4, 7, 11]);
    expect(pcs('C5')).toEqual([0, 7]);
  });
  it('handles alterations', () => {
    expect(pcs('G7b9')).toEqual([2, 5, 7, 8, 11]); // G B D F Ab
    expect(pcs('C7#5')).toEqual([0, 4, 8, 10]);
    expect(pcs('Cm7b5')).toEqual([0, 3, 6, 10]);
    expect(pcs('Cmmaj7')).toEqual([0, 3, 7, 11]);
  });
  it('treats a slash bass outside the chord as an extra required note', () => {
    const t = analyzeChord(chord('C/D'))!;
    expect(t.bassPc).toBe(2);
    expect(t.tones.find((x) => x.pc === 2)?.required).toBe(true);
  });
  it('returns null for suffixes it does not understand', () => {
    expect(analyzeChord(chord('Calt'))).toBeNull();
    expect(analyzeChord({ root: chord('C').root, suffix: 'xyz' })).toBeNull();
  });
});

describe('guitar voicings: the shapes everyone knows', () => {
  const canon: Record<string, string> = {
    C: 'x32010', G: '320003', D: 'xx0232', A: 'x02220', E: '022100', Am: 'x02210', Em: '022000',
    Dm: 'xx0231', F: '133211', Bm: 'x24432', B7: 'x21202', Am7: 'x02010', G7: '320001', Cmaj7: 'x32000',
    E7: '020100', D7: 'xx0212', A7: 'x02020', Asus2: 'x02200', 'C/G': '332010', 'D/F#': '200232',
    'F#m': '244222', Gmaj7: '320002', Dmaj7: 'xx0222',
  };
  for (const [name, expected] of Object.entries(canon)) {
    it(`${name} -> ${expected}`, () => {
      expect(shape(frettedVoicings(chord(name), 'guitar')[0]!.frets)).toBe(expected);
    });
  }
});

describe('ukulele voicings: the shapes everyone knows', () => {
  const canon: Record<string, string> = {
    C: '0003', Am: '2000', F: '2010', G: '0232', D: '2220', Dm: '2210', A: '2100', C7: '0001', G7: '0212',
    Bb: '3211', Fmaj7: '2413',
  };
  for (const [name, expected] of Object.entries(canon)) {
    it(`${name} -> ${expected}`, () => {
      expect(shape(frettedVoicings(chord(name), 'ukulele')[0]!.frets)).toBe(expected);
    });
  }
});

describe('fretted voicings are always theory-correct', () => {
  const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const quals = [
    '', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', 'dim', 'aug', '6', '9', 'add9', 'm6', 'm7b5', 'dim7', '5',
    '7sus4', 'maj9', 'm9', '7b9', '7#9', 'madd9', 'mmaj7', '6/9', '11', '13', '7#5', 'maj7#11',
  ];
  const instruments: FrettedInstrument[] = ['guitar', 'ukulele'];

  for (const inst of instruments) {
    it(`${inst}: every shape contains the required notes, sits in reach, and has the right bass`, () => {
      const missing: string[] = [];
      for (const r of roots)
        for (const q of quals) {
          const c = chord(r + q);
          const t = analyzeChord(c)!;
          const voicings = frettedVoicings(c, inst, 5);
          if (voicings.length === 0) missing.push(formatChord(c));
          for (const v of voicings) {
            const tuning = TUNINGS[inst];
            const notes = v.frets.map((f, i) => (f >= 0 ? tuning[i]! + f : null)).filter((x): x is number => x !== null);
            const got = new Set(notes.map((n) => n % 12));
            const allowed = new Set(t.tones.map((x) => x.pc));
            for (const g of got) expect(allowed.has(g), `${formatChord(c)} ${shape(v.frets)} has a wrong note`).toBe(true);
            for (const x of t.tones.filter((x) => x.required))
              expect(got.has(x.pc), `${formatChord(c)} ${shape(v.frets)} lacks a required note`).toBe(true);
            if (inst === 'guitar') expect(Math.min(...notes) % 12).toBe(t.bassPc);
            const fretted = v.frets.filter((f) => f > 0);
            if (fretted.length) expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(3);
            expect(v.fingers).toBeLessThanOrEqual(4);
          }
        }
      // basic chords must always have a diagram; exotic ones may legitimately have none
      const basic = missing.filter((m) => /^[A-G][#b]?(m|7|maj7|m7|sus4|sus2|dim|aug|6|add9|5)?$/.test(m));
      expect(basic).toEqual([]);
    });
  }

  it('slash chords put the slash note in the bass', () => {
    for (const [name, bass] of [['C/E', 4], ['G/B', 11], ['D/F#', 6], ['Am/G', 7], ['F/C', 0]] as const) {
      const v = frettedVoicings(chord(name), 'guitar', 3);
      expect(v.length, name).toBeGreaterThan(0);
      for (const x of v) {
        const notes = x.frets.map((f, i) => (f >= 0 ? TUNINGS.guitar[i]! + f : null)).filter((n): n is number => n !== null);
        expect(Math.min(...notes) % 12, `${name} ${shape(x.frets)}`).toBe(bass);
      }
    }
  });

  it('offers several distinct positions up the neck', () => {
    const v = frettedVoicings(chord('A'), 'guitar', 4);
    expect(v.length).toBeGreaterThanOrEqual(3);
    expect(new Set(v.map((x) => shape(x.frets))).size).toBe(v.length);
  });

  it('a barre chord reports its barre and the nut moves with the position', () => {
    const f = frettedVoicings(chord('F'), 'guitar')[0]!;
    expect(f.barre).toEqual({ fret: 1, from: 0, to: 5 });
    const high = frettedVoicings(chord('F'), 'guitar', 4).find((x) => Math.min(...x.frets.filter((n) => n > 0)) >= 6)!;
    expect(high.baseFret).toBeGreaterThan(1);
  });

  it('draws separate fingers, not a barre, for neighbouring notes on one fret', () => {
    for (const name of ['Em', 'A', 'E', 'Am', 'D']) {
      expect(frettedVoicings(chord(name), 'guitar')[0]!.barre, name).toBeNull();
    }
    expect(frettedVoicings(chord('Bm'), 'guitar')[0]!.barre).toMatchObject({ fret: 2 });
  });

  it('returns nothing for chords it cannot analyse', () => {
    expect(frettedVoicings(chord('Calt'), 'guitar')).toEqual([]);
  });
});

describe('piano voicings', () => {
  const notes = (s: string, i = 0) => pianoVoicings(chord(s))[i]!.notes;
  it('stacks the chord upward from the root', () => {
    expect(notes('C')).toEqual([60, 64, 67]);
    expect(notes('Am')).toEqual([69, 72, 76]);
    expect(notes('Cmaj7')).toEqual([60, 64, 67, 71]);
    expect(notes('C7')).toEqual([60, 64, 67, 70]);
  });
  it('puts extensions above the octave and drops the 5th on extended chords', () => {
    expect(notes('Cadd9')).toEqual([60, 64, 67, 74]);
    expect(notes('C9')).toEqual([60, 64, 70, 74]);
  });
  it('builds inversions', () => {
    const v = pianoVoicings(chord('C'));
    expect(v.map((x) => x.label)).toEqual(['Root position', '1st inversion', '2nd inversion']);
    expect(v[1]!.notes.map((n) => n % 12).sort((a, b) => a - b)).toEqual([0, 4, 7]);
    expect(v[1]!.notes[0]! % 12).toBe(4);
    expect(v[2]!.notes[0]! % 12).toBe(7);
  });
  it('adds a slash bass below the chord', () => {
    const n = notes('C/E');
    expect(n[0]! % 12).toBe(4);
    expect(n[0]!).toBeLessThan(Math.min(...n.slice(1)));
  });
  it('every voicing contains exactly the chord tones', () => {
    for (const name of ['G7', 'Bm7b5', 'Fmaj7', 'Dsus4', 'Eaug', 'A6']) {
      const allowed = new Set(analyzeChord(chord(name))!.tones.map((t) => t.pc));
      for (const v of pianoVoicings(chord(name))) for (const n of v.notes) expect(allowed.has(n % 12), name).toBe(true);
    }
  });
  it('spells helper sanity', () => {
    expect(spellPitchClass(1, 'flats')).toEqual({ letter: 'D', accidental: -1 });
  });
});
