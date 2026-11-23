import { uid } from './id';
import type { Line, Section, Song } from './types';

/** Build a line, placing each chord above the first occurrence of an anchor substring. */
export function mkLine(lyrics: string, ...chords: [anchor: string | number, chord: string][]): Line {
  return {
    id: uid(),
    lyrics,
    chords: chords.map(([anchor, text]) => {
      const at = typeof anchor === 'number' ? anchor : lyrics.indexOf(anchor);
      if (at < 0) throw new Error(`anchor "${anchor}" not found in "${lyrics}"`);
      return { id: uid(), at, text };
    }),
  };
}

export const mkSection = (label: string, ...lines: Line[]): Section => ({
  id: uid(),
  label,
  lines,
});

export function mkSong(init: Partial<Song> & Pick<Song, 'title'>): Song {
  const now = Date.now();
  return {
    id: uid(),
    artist: '',
    key: null,
    bpm: null,
    sections: [],
    createdAt: now,
    updatedAt: now,
    ...init,
  };
}
