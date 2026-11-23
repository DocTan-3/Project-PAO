import { describe, expect, it } from 'vitest';
import { mkSong } from './build';
import { alphabet, countByLanguage, groupSongs, languageOf, letterOf, sortKey } from './library';
import type { Language, Song } from './types';

const song = (title: string, language?: Language): Song => mkSong({ title, language });
const titles = (songs: Song[], lang: Language) => groupSongs(songs, lang).flatMap((g) => g.songs.map((s) => s.title));
const letters = (songs: Song[], lang: Language) => groupSongs(songs, lang).map((g) => g.letter);

describe('languageOf', () => {
  it('songs without a language are English', () => {
    expect(languageOf(song('x'))).toBe('en');
    expect(languageOf(song('x', 'en'))).toBe('en');
    expect(languageOf(song('x', 'tl'))).toBe('tl');
  });
});

describe('English sorting', () => {
  it('sorts A to Z ignoring case', () => {
    const s = ['banana', 'Apple', 'cherry', 'apricot', 'Blueberry'].map((t) => song(t));
    expect(titles(s, 'en')).toEqual(['Apple', 'apricot', 'banana', 'Blueberry', 'cherry']);
  });
  it('ignores leading quotes and punctuation', () => {
    const s = ["'Twas grace", '"Hallelujah"', 'Amazing Grace', '(Sittin\' On) The Dock'].map((t) => song(t));
    expect(titles(s, 'en')).toEqual(['Amazing Grace', '"Hallelujah"', '(Sittin\' On) The Dock', "'Twas grace"]);
    expect(letterOf("'Twas grace", 'en')).toBe('T');
    expect(letterOf('"Hallelujah"', 'en')).toBe('H');
  });
  it('ignores accents', () => {
    expect(letterOf('Éclair', 'en')).toBe('E');
    expect(letterOf('Über', 'en')).toBe('U');
  });
  it('puts digits and symbols in a "#" group at the end', () => {
    const s = ['99 Problems', 'Zebra', 'Apple', '!!!'].map((t) => song(t));
    expect(letters(s, 'en')).toEqual(['A', 'Z', '#']);
    expect(titles(s, 'en')).toEqual(['Apple', 'Zebra', '!!!', '99 Problems']);
  });
  it('a space sorts before a letter, like a dictionary', () => {
    const s = ['Ab c', 'Abc', 'A b'].map((t) => song(t));
    expect(titles(s, 'en')).toEqual(['A b', 'Ab c', 'Abc']);
  });
  it('is stable for identical titles', () => {
    const a = song('Same'), b = song('Same');
    expect(titles([b, a], 'en')).toEqual(['Same', 'Same']);
    expect(groupSongs([b, a], 'en')[0]!.songs.map((s) => s.id)).toEqual(groupSongs([a, b], 'en')[0]!.songs.map((s) => s.id));
  });
});

describe('Tagalog sorting (Filipino alphabet)', () => {
  it('N, then Ñ, then NG, then O', () => {
    const s = ['Ngayon', 'Nena', 'Ñora', 'Oyayi', 'Nanay', 'Nga'].map((t) => song(t, 'tl'));
    expect(titles(s, 'tl')).toEqual(['Nanay', 'Nena', 'Ñora', 'Nga', 'Ngayon', 'Oyayi']);
    expect(letters(s, 'tl')).toEqual(['N', 'Ñ', 'NG', 'O']);
  });
  it('NG is its own letter wherever it appears first', () => {
    expect(letterOf('Ngayon', 'tl')).toBe('NG');
    expect(letterOf('ngiti', 'tl')).toBe('NG');
    expect(letterOf('Nagaral', 'tl')).toBe('N');
    expect(letterOf('Ñandú', 'tl')).toBe('Ñ');
  });
  it('the same letters in English are plain N', () => {
    expect(letterOf('Ngayon', 'en')).toBe('N');
    expect(letterOf('Ñandú', 'en')).toBe('N');
  });
  it('ordinary Tagalog titles sort A to Z with accents ignored', () => {
    const s = ['Magtanim Ay Di Biro', 'Bahay Kubo', 'Leron, Leron Sinta', 'Álamat'].map((t) => song(t, 'tl'));
    expect(titles(s, 'tl')).toEqual(['Álamat', 'Bahay Kubo', 'Leron, Leron Sinta', 'Magtanim Ay Di Biro']);
    expect(letters(s, 'tl')).toEqual(['A', 'B', 'L', 'M']);
  });
});

describe('separating the languages', () => {
  const all = [song('Amazing Grace'), song('Bahay Kubo', 'tl'), song('Zebra', 'en'), song('Alamat', 'tl')];
  it('each list holds only its own language', () => {
    expect(titles(all, 'en')).toEqual(['Amazing Grace', 'Zebra']);
    expect(titles(all, 'tl')).toEqual(['Alamat', 'Bahay Kubo']);
  });
  it('counts per language', () => {
    expect(countByLanguage(all)).toEqual({ en: 2, tl: 2 });
    expect(countByLanguage([])).toEqual({ en: 0, tl: 0 });
  });
  it('an empty list has no groups', () => {
    expect(groupSongs([], 'en')).toEqual([]);
    expect(groupSongs([song('x')], 'tl')).toEqual([]);
  });
});

describe('alphabet()', () => {
  it('English is A-Z then #', () => {
    expect(alphabet('en')).toHaveLength(27);
    expect(alphabet('en')[26]).toBe('#');
  });
  it('Tagalog adds Ñ and NG after N', () => {
    const a = alphabet('tl');
    expect(a.slice(a.indexOf('N'), a.indexOf('N') + 4)).toEqual(['N', 'Ñ', 'NG', 'O']);
    expect(a).toHaveLength(29);
  });
  it('sortKey strips punctuation but keeps words apart', () => {
    expect(sortKey("  Don't  Stop!  ", 'en')).toBe('dont stop');
  });
});
