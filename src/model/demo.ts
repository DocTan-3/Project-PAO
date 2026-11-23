import { mkLine as L, mkSection as S, mkSong } from './build';
import type { Song } from './types';

/** Public-domain songs used to seed an empty library. */
export function demoSongs(): Song[] {
  return [
    mkSong({
      title: 'Amazing Grace',
      artist: 'Traditional',
      key: 'G',
      bpm: 72,
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
      artist: 'Traditional',
      key: 'Am',
      bpm: 110,
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
      artist: 'Traditional',
      key: 'Bb',
      bpm: 100,
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
