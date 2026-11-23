import { describe, expect, it } from 'vitest';
import {
  capoShape,
  capoShapeKey,
  capoSuggestions,
  formatChord,
  formatKey,
  parseChord,
  parseKey,
  semitonesBetween,
  spellInKey,
  transposeChord,
  transposeKey,
  formatNote,
  pitchClass,
} from './index';

const chord = (s: string) => {
  const c = parseChord(s);
  if (!c) throw new Error(`bad chord ${s}`);
  return c;
};
const key = (s: string) => {
  const k = parseKey(s);
  if (!k) throw new Error(`bad key ${s}`);
  return k;
};

describe('parseChord / formatChord', () => {
  it.each([
    'C', 'Am', 'F#m7b5', 'Bb/D', 'Cmaj7', 'Csus4', 'Eadd9', 'Dm7/G',
    'G7(b9)', 'Bdim', 'Caug', 'C+', 'Abm', 'E7#9', 'F#', 'C6/9', 'Dsus2',
  ])('round-trips %s', (s) => {
    expect(formatChord(chord(s))).toBe(s);
  });

  it.each(['Bad', 'Hello', 'H', 'x', '', 'Am/', 'Cfoo', 'a'])('rejects %s', (s) => {
    expect(parseChord(s)).toBeNull();
  });

  it('keeps the suffix verbatim and splits root/bass', () => {
    const c = chord('F#m7b5/C');
    expect(formatNote(c.root)).toBe('F#');
    expect(c.suffix).toBe('m7b5');
    expect(formatNote(c.bass!)).toBe('C');
  });

  it('reads Bb as B-flat, not B with suffix b', () => {
    expect(chord('Bb').root).toEqual({ letter: 'B', accidental: -1 });
    expect(chord('Bbm').suffix).toBe('m');
  });
});

describe('parseKey / formatKey', () => {
  it('parses major and minor', () => {
    expect(formatKey(key('F#m'))).toBe('F#m');
    expect(formatKey(key('Bb'))).toBe('Bb');
    expect(key('Am').mode).toBe('minor');
  });
  it('rejects junk', () => {
    expect(parseKey('H')).toBeNull();
    expect(parseKey('Cx')).toBeNull();
  });
});

describe('spellInKey', () => {
  const sp = (pcs: number, k: string) => formatNote(spellInKey(pcs, key(k)));
  it('spells chromatic notes by scale degree', () => {
    expect(sp(3, 'C')).toBe('Eb'); // b3
    expect(sp(8, 'C')).toBe('Ab'); // b6
    expect(sp(10, 'C')).toBe('Bb'); // b7
    expect(sp(6, 'C')).toBe('F#'); // #4
    expect(sp(8, 'Am')).toBe('G#'); // leading tone in A minor
    expect(sp(10, 'F')).toBe('Bb');
    expect(sp(6, 'G')).toBe('F#');
    expect(sp(5, 'F#')).toBe('E#'); // 7th of F# major
  });
});

describe('transposeKey', () => {
  const t = (k: string, n: number) => formatKey(transposeKey(key(k), n));
  it('picks the simpler enharmonic key', () => {
    expect(t('C', 1)).toBe('Db');
    expect(t('Cm', 1)).toBe('C#m');
    expect(t('A', 3)).toBe('C');
    expect(t('C', 11)).toBe('B');
    expect(t('G', 3)).toBe('Bb');
    expect(t('Em', 3)).toBe('Gm');
  });
  it('is a full 12-semitone cycle', () => {
    for (const k of ['C', 'Am', 'F#', 'Bbm', 'Eb']) {
      expect(formatKey(transposeKey(key(k), 12))).toBe(k);
    }
  });
  it('semitonesBetween', () => {
    expect(semitonesBetween(key('C'), key('Eb'))).toBe(3);
    expect(semitonesBetween(key('G'), key('C'))).toBe(5);
  });
});

describe('transposeChord', () => {
  const song = ['C', 'F', 'G', 'Am'].map(chord);
  it('moves a progression to a flat key with flat spelling', () => {
    const to = key('Eb');
    const out = song.map((c) => formatChord(transposeChord(c, 3, to)));
    expect(out).toEqual(['Eb', 'Ab', 'Bb', 'Cm']);
  });
  it('moves a progression to a sharp key', () => {
    const to = key('E');
    const out = song.map((c) => formatChord(transposeChord(c, 4, to)));
    expect(out).toEqual(['E', 'A', 'B', 'C#m']);
  });
  it('transposes the bass note and preserves suffix', () => {
    const out = transposeChord(chord('D7sus4/F#'), 2, key('E'));
    expect(formatChord(out)).toBe('E7sus4/G#');
  });
  it('spells borrowed chords sensibly (bVII in C)', () => {
    expect(formatChord(transposeChord(chord('Bb'), 0, key('C')))).toBe('Bb');
  });
  it('plain sharps/flats spelling works without a key', () => {
    expect(formatChord(transposeChord(chord('C'), 1, 'sharps'))).toBe('C#');
    expect(formatChord(transposeChord(chord('C'), 1, 'flats'))).toBe('Db');
  });
  it('transposing up then down restores pitch classes', () => {
    for (let n = 0; n < 12; n++) {
      const up = transposeChord(chord('F#m7/C#'), n, 'sharps');
      const back = transposeChord(up, -n, 'sharps');
      expect(pitchClass(back.root)).toBe(pitchClass(chord('F#m7/C#').root));
      expect(pitchClass(back.bass!)).toBe(pitchClass(chord('F#m7/C#').bass!));
    }
  });
});

describe('capo', () => {
  it('song in A, capo 2 -> play G shapes', () => {
    const shapeKey = capoShapeKey(key('A'), 2);
    expect(formatKey(shapeKey)).toBe('G');
    const out = ['A', 'D', 'E', 'F#m'].map((s) => formatChord(capoShape(chord(s), 2, shapeKey)));
    expect(out).toEqual(['G', 'C', 'D', 'Em']);
  });
  it('song in Bb, capo 3 -> G shapes', () => {
    const shapeKey = capoShapeKey(key('Bb'), 3);
    expect(formatKey(shapeKey)).toBe('G');
    expect(formatChord(capoShape(chord('Eb'), 3, shapeKey))).toBe('C');
  });
  it('capo 0 is identity', () => {
    const k = key('D');
    expect(formatChord(capoShape(chord('Bm7'), 0, capoShapeKey(k, 0)))).toBe('Bm7');
  });
  it('suggests friendly shape keys first', () => {
    const s = capoSuggestions(key('Eb'));
    expect(s[0]!.friendly).toBe(true);
    const byCapo = Object.fromEntries(s.map((o) => [o.capo, formatKey(o.shapeKey)]));
    expect(byCapo[1]).toBe('D');
    expect(byCapo[3]).toBe('C');
    expect(byCapo[8]).toBe('G');
  });
});
