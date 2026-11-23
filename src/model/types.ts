/** A chord pinned to a character position in its line's lyrics. */
export interface PlacedChord {
  id: string;
  /** index into `Line.lyrics` the chord sits above (0..lyrics.length) */
  at: number;
  /** chord as written, e.g. "F#m7/C#" (parsed on demand; unparseable text is kept as-is) */
  text: string;
  /** duration in beats, for chord highlight (default 4) */
  beats?: number;
}

export interface Line {
  id: string;
  lyrics: string;
  chords: PlacedChord[];
}

export interface Section {
  id: string;
  /** "Verse 1", "Chorus", ... may be empty */
  label: string;
  lines: Line[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** free-text details for other players (tuning, strumming, who plays what...) */
  notes?: string;
  /** key the chords are written in, e.g. "G" or "F#m"; null = unknown */
  key: string | null;
  bpm: number | null;
  sections: Section[];
  createdAt: number;
  updatedAt: number;
}

/** Per-viewer display choices; never changes the stored song. */
export interface ViewSettings {
  /** transpose offset in semitones relative to the written key */
  semitones: number;
}
