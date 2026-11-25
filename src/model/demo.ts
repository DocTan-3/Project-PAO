import { mkLine as L, mkSection as S, mkSong } from './build';
import type { Song } from './types';

/** Public-domain songs used to seed an empty library. */
export function demoSongs(): Song[] {
  return [...englishDemoSongs(), ...tagalogDemoSongs()].map(fixed);
}

/** Every phone gets the same id and time for a sample song, so a team update never shows one twice. */
const DEMO_TIME = Date.UTC(2026, 0, 1);
const fixed = (s: Song): Song => ({
  ...s,
  id: `demo-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  createdAt: DEMO_TIME,
  updatedAt: DEMO_TIME,
});

function englishDemoSongs(): Song[] {
  return [
    mkSong({
      title: 'Amazing Grace',
      language: 'en',
      artist: 'Traditional',
      key: 'G',
      sections: [
        S(
          'Verse 1',
          L('Amazing grace, how sweet the sound', ['Amazing', 'G'], ['sweet', 'G7'], ['sound', 'C']),
          L('That saved a wretch like me', ['That', 'G'], ['wretch', 'Em'], ['me', 'D']),
          L('I once was lost, but now am found', ['I once', 'G'], ['but now', 'G7'], ['found', 'C']),
          L('Was blind, but now I see', ['Was', 'G'], ['now', 'D'], ['see', 'G']),
        ),
        S(
          'Verse 2',
          L("'Twas grace that taught my heart to fear", ['grace', 'G'], ['heart', 'G7'], ['fear', 'C']),
          L('And grace my fears relieved', ['And', 'G'], ['fears', 'Em'], ['relieved', 'D']),
          L('How precious did that grace appear', ['How', 'G'], ['that', 'G7'], ['appear', 'C']),
          L('The hour I first believed', ['The', 'G'], ['first', 'D'], ['believed', 'G']),
        ),
      ],
    }),
    mkSong({
      title: 'House of the Rising Sun',
      language: 'en',
      artist: 'Traditional',
      key: 'Am',
      sections: [
        S(
          'Intro',
          L('', [0, 'Am'], [0, 'C'], [0, 'D'], [0, 'F'], [0, 'Am'], [0, 'E'], [0, 'Am'], [0, 'E']),
        ),
        S(
          'Verse 1',
          L('There is a house in New Orleans', ['There', 'Am'], ['house', 'C'], ['New', 'D'], ['Orleans', 'F']),
          L('They call the Rising Sun', ['They', 'Am'], ['Rising', 'C'], ['Sun', 'E']),
          L("And it's been the ruin of many a poor boy", ['And', 'Am'], ['ruin', 'C'], ['poor', 'D'], ['boy', 'F']),
          L("And God, I know I'm one", ['And', 'Am'], ['know', 'E'], ['one', 'Am']),
        ),
        S(
          'Verse 2',
          L('My mother was a tailor', ['My', 'Am'], ['tailor', 'C']),
          L('She sewed my new blue jeans', ['She', 'D'], ['new', 'F'], ['jeans', 'Am']),
          L('My father was a gambling man', ['My', 'C'], ['gambling', 'D'], ['man', 'F']),
          L('Down in New Orleans', ['Down', 'Am'], ['New', 'E'], ['Orleans', 'Am']),
        ),
      ],
    }),
    mkSong({
      title: 'Down by the Riverside',
      language: 'en',
      artist: 'Traditional',
      key: 'Bb',
      sections: [
        S(
          'Verse',
          L("Gonna lay down my sword and shield", ['Gonna', 'Bb'], ['sword', 'Eb'], ['shield', 'Bb']),
          L('Down by the riverside', ['Down', 'Bb'], ['river', 'F7'], ['side', 'Bb']),
          L("Ain't gonna study war no more", ['Ain', 'Bb'], ['study', 'Gm'], ['more', 'F/A']),
        ),
        S(
          'Chorus',
          L("I ain't gonna study war no more", ['I ain', 'Bb'], ['study', 'Eb'], ['war', 'F7'], ['more', 'Bb/D']),
        ),
      ],
    }),
  ];
}

/** Traditional Filipino folk songs (public domain). */
export function tagalogDemoSongs(): Song[] {
  return tagalogRaw().map(fixed);
}

function tagalogRaw(): Song[] {
  return [
    mkSong({
      title: 'Bahay Kubo',
      artist: 'Katutubong awit',
      language: 'tl',
      key: 'C',
      sections: [
        S(
          'Verse',
          L('Bahay kubo, kahit munti', ['Bahay', 'C'], ['munti', 'G7']),
          L('Ang halaman doon ay sari-sari', ['Ang', 'C'], ['sari-sari', 'G7']),
          L('Singkamas at talong, sigarilyas at mani', ['Singkamas', 'C'], ['sigarilyas', 'G7']),
          L('Sitaw, bataw, patani', ['Sitaw', 'C'], ['patani', 'G7']),
          L("Kundol, patola, upo't kalabasa", ['Kundol', 'C'], ['kalabasa', 'G7']),
          L('At saka mayroon pang labanos, mustasa', ['At', 'C'], ['mustasa', 'G7']),
          L('Sibuyas, kamatis, bawang at luya', ['Sibuyas', 'C'], ['luya', 'G7']),
          L('Sa paligid-ligid ay puno ng linga', ['Sa', 'C'], ['puno', 'G7'], ['linga', 'C']),
        ),
      ],
    }),
    mkSong({
      title: 'Leron, Leron Sinta',
      artist: 'Katutubong awit',
      language: 'tl',
      key: 'G',
      sections: [
        S(
          'Verse',
          L('Leron, leron sinta', ['Leron', 'G'], ['sinta', 'D7']),
          L('Buko ng papaya', ['Buko', 'G']),
          L("Dala-dala'y buslo", ['Dala', 'D7']),
          L('Sisidlan ng bunga', ['Sisidlan', 'G']),
          L('Pagdating sa dulo', ['Pagdating', 'G']),
          L('Nabali ang sanga', ['Nabali', 'D7']),
          L('Kapos kapalaran', ['Kapos', 'D7']),
          L('Humanap ng iba', ['Humanap', 'G']),
        ),
      ],
    }),
    mkSong({
      title: 'Magtanim Ay Di Biro',
      artist: 'Katutubong awit',
      language: 'tl',
      key: 'G',
      sections: [
        S(
          'Verse',
          L('Magtanim ay di biro', ['Magtanim', 'G'], ['biro', 'D']),
          L('Maghapong nakayuko', ['Maghapong', 'G'], ['nakayuko', 'D']),
          L('Di naman makatayo', ['Di', 'G'], ['makatayo', 'D']),
          L('Di naman makaupo', ['Di', 'D'], ['makaupo', 'G']),
          L("Braso ko'y namamanhid", ['Braso', 'G'], ['namamanhid', 'D']),
          L("Baywang ko'y nangangawit", ['Baywang', 'G'], ['nangangawit', 'D']),
          L("Binti ko'y namimitig", ['Binti', 'G'], ['namimitig', 'D']),
          L('Sa pagod at sakit', ['Sa', 'D'], ['sakit', 'G']),
        ),
      ],
    }),
  ];
}
