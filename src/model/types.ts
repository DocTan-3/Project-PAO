/** A chord pinned to a character position in its line's lyrics. */
export interface PlacedChord {
  id: string;
  /** index into `Line.lyrics` the chord sits above (0..lyrics.length) */
  at: number;
  /** chord as written, e.g. "F#m7/C#" (parsed on demand; unparseable text is kept as-is) */
  text: string;
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

export type Language = 'en' | 'tl';

/** What a song is mostly used for in a service. Optional; a song has at most one. */
export type Category = 'praise' | 'worship' | 'welcome';

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** which list the song belongs to; songs saved before this existed are English */
  language?: Language;
  /** Praise, Worship or Welcome (optional) */
  category?: Category;
  /** free-text details for other players (tuning, strumming, who plays what...) */
  notes?: string;
  /** a web link to a reference video (optional) */
  videoUrl?: string;
  /** key the chords are written in, e.g. "G" or "F#m"; null = unknown */
  key: string | null;
  sections: Section[];
  /** 'admin' = this copy came from the team's published songs; anything else is the person's own song */
  source?: 'admin';
  createdAt: number;
  updatedAt: number;
}

/** Per-viewer display choices; never changes the stored song. */
export interface ViewSettings {
  /** transpose offset in semitones relative to the written key */
  semitones: number;
}
