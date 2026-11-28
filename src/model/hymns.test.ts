import { describe, expect, it } from 'vitest';
import { parseChord } from '../theory';
import { allHymns } from './hymns';

describe('sample hymns', () => {
  const songs = allHymns();
  it('has many songs with unique ids, in both languages', () => {
    expect(songs.length).toBeGreaterThanOrEqual(20);
    expect(new Set(songs.map((s) => s.id)).size).toBe(songs.length);
    expect(songs.some((s) => s.language === 'tl')).toBe(true);
  });
  it('places every chord inside its line and every chord can be read', () => {
    for (const s of songs)
      for (const sec of s.sections)
        for (const line of sec.lines) {
          expect(line.lyrics.trim().length, `${s.title} has an empty line`).toBeGreaterThan(0);
          for (const c of line.chords) {
            expect(c.at).toBeGreaterThanOrEqual(0);
            expect(c.at).toBeLessThanOrEqual(line.lyrics.length);
            expect(parseChord(c.text), `${s.title}: ${c.text}`).not.toBeNull();
          }
        }
  });
  it('every song has a key and at least one chord', () => {
    for (const s of songs) {
      expect(s.key, s.title).toBeTruthy();
      expect(s.sections.some((sec) => sec.lines.some((l) => l.chords.length > 0)), s.title).toBe(true);
    }
  });
});
