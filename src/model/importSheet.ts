import { parseChord } from '../theory';
import { uid } from './id';
import type { Line, Section } from './types';

const SECTION_RE =
  /^\s*(?:\[([^\]]+)\]|((?:verse|chorus|bridge|intro|outro|pre-?chorus|interlude|solo|refrain|tag|instrumental)\b[^\n]*?):?)\s*$/i;

/** Tokens allowed on a chord line besides chords: bar lines, repeat marks, dashes. */
const FILLER_RE = /^(?:\||\|\||-|–|x\d+|\(?x\d+\)?|\/|%)$/i;

function chordTokens(line: string): { col: number; text: string }[] | null {
  const tokens: { col: number; text: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let chords = 0;
  while ((m = re.exec(line))) {
    const t = m[0];
    if (parseChord(t)) {
      tokens.push({ col: m.index, text: t });
      chords++;
    } else if (!FILLER_RE.test(t)) return null;
  }
  if (chords === 0) return null;
  // A lone "A" is far more likely a word than a chord.
  if (tokens.length === 1 && /^[Aa]$/.test(tokens[0]!.text) && line.trim() === tokens[0]!.text) return null;
  return tokens;
}

/**
 * Parse a "chords above lyrics" plain-text sheet (the format used by most
 * chord sites) into sections of lines with anchored chords.
 */
export function parseChordSheet(input: string): Section[] {
  const rows = input.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;
  const ensure = (): Section => {
    if (!current) {
      current = { id: uid(), label: '', lines: [] };
      sections.push(current);
    }
    return current;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.trim() === '') continue;

    const sec = SECTION_RE.exec(row);
    if (sec && !chordTokens(row)) {
      current = { id: uid(), label: (sec[1] ?? sec[2] ?? '').trim(), lines: [] };
      sections.push(current);
      continue;
    }

    const tokens = chordTokens(row);
    if (tokens) {
      const next = rows[i + 1];
      const nextIsLyric =
        next !== undefined &&
        next.trim() !== '' &&
        !chordTokens(next) &&
        !(SECTION_RE.test(next) && !chordTokens(next));
      const lyrics = nextIsLyric ? next! : '';
      const line: Line = {
        id: uid(),
        lyrics,
        chords: tokens.map((t) => ({
          id: uid(),
          at: nextIsLyric ? Math.min(t.col, lyrics.length) : 0,
          text: t.text,
        })),
      };
      ensure().lines.push(line);
      if (nextIsLyric) i++;
      continue;
    }

    ensure().lines.push({ id: uid(), lyrics: row.replace(/\s+$/, ''), chords: [] });
  }
  return sections;
}
