import type { Language, Song } from './types';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'tl', label: 'Tagalog' },
];

/** Songs saved before languages existed have none: they are English. */
export const languageOf = (song: Song): Language => (song.language === 'tl' ? 'tl' : 'en');

const ENYE = ''; // stand-in for "ñ" while accents are stripped

/**
 * A key that sorts titles the way a person expects: case, accents, punctuation and
 * leading quotes are ignored. Tagalog follows the Filipino alphabet, where Ñ and then NG
 * are letters of their own after N (so "Ngayon" sorts after every N word, not among them).
 */
export function sortKey(title: string, lang: Language): string {
  let t = title.trim().toLowerCase();
  if (lang === 'tl') t = t.replace(/ñ/g, ENYE);
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(new RegExp(`[^a-z0-9${ENYE} ]`, 'g'), '').replace(/\s+/g, ' ').trim();
  if (lang === 'tl') t = t.replace(new RegExp(ENYE, 'g'), 'n{').replace(/ng/g, 'n|');
  return t;
}

/** The group heading a title falls under: "A".."Z" ("Ñ" and "NG" for Tagalog) or "#". */
export function letterOf(title: string, lang: Language): string {
  const k = sortKey(title, lang);
  if (lang === 'tl') {
    if (k.startsWith('n{')) return 'Ñ';
    if (k.startsWith('n|')) return 'NG';
  }
  const c = k[0];
  return c && c >= 'a' && c <= 'z' ? c.toUpperCase() : '#';
}

const Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** The order of letters in each language's list ("#" always last). */
export function alphabet(lang: Language): string[] {
  const letters = lang === 'tl' ? Z.flatMap((l) => (l === 'N' ? ['N', 'Ñ', 'NG'] : [l])) : Z;
  return [...letters, '#'];
}

export interface LetterGroup {
  letter: string;
  songs: Song[];
}

/** One language's songs, sorted A to Z and grouped under their first letter. */
export function groupSongs(songs: Song[], lang: Language): LetterGroup[] {
  const order = alphabet(lang);
  const rows = songs
    .filter((s) => languageOf(s) === lang)
    .map((s) => ({ s, key: sortKey(s.title, lang), letter: letterOf(s.title, lang) }))
    .sort(
      (a, b) =>
        order.indexOf(a.letter) - order.indexOf(b.letter) ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) ||
        a.s.title.localeCompare(b.s.title) ||
        a.s.id.localeCompare(b.s.id),
    );
  const groups: LetterGroup[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.letter === r.letter) last.songs.push(r.s);
    else groups.push({ letter: r.letter, songs: [r.s] });
  }
  return groups;
}

export const countByLanguage = (songs: Song[]): Record<Language, number> => ({
  en: songs.filter((s) => languageOf(s) === 'en').length,
  tl: songs.filter((s) => languageOf(s) === 'tl').length,
});
