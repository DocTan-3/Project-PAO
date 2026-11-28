import { mkLine, mkSection, mkSong } from './build';
import type { Language, Section, Song } from './types';

/**
 * Sample songs: public-domain Christian hymns with simple chords. Write the chords in square brackets
 * right before the syllable they sit above, for example "[G]Amazing [G7]grace".
 */
function parseLine(text: string) {
  const chords: [number, string][] = [];
  let lyrics = '';
  for (const part of text.split(/(\[[^\]]+\])/)) {
    const m = /^\[([^\]]+)\]$/.exec(part);
    if (m) chords.push([lyrics.length, m[1]!]);
    else lyrics += part;
  }
  return mkLine(lyrics, ...chords);
}

function hymn(title: string, artist: string, key: string, language: Language, parts: [label: string, body: string][]): Song {
  const sections: Section[] = parts.map(([label, body]) =>
    mkSection(
      label,
      ...body
        .trim()
        .split('\n')
        .map((l) => parseLine(l.trim())),
    ),
  );
  return mkSong({ title, artist, key, language, sections });
}

/** English hymns (public domain). */
export function hymnSongs(): Song[] {
  return [
    hymn('Holy, Holy, Holy', 'Reginald Heber', 'D', 'en', [
      ['Verse 1', `
[D]Holy, holy, [G]holy! [D]Lord God Al[A]mighty!
[D]Early in the [G]morning our [D]song shall rise to [A]Thee
[D]Holy, holy, [G]holy! Merciful and [D]mighty
[G]God in three Per[D]sons, bless[A]ed [D]Trinity`],
      ['Verse 2', `
[D]Holy, holy, [G]holy! All the saints adore [D]Thee
[D]Casting down their [G]golden crowns a[D]round the glassy [A]sea
[D]Cherubim and [G]seraphim fall[D]ing down be[A]fore Thee
[G]Who wert, and art, and [D]evermore shalt [A]be[D]`],
    ]),
    hymn('It Is Well with My Soul', 'Horatio Spafford', 'D', 'en', [
      ['Verse 1', `
[D]When peace like a [G]river at[D]tendeth my way
[D]When sorrows like [A]sea billows [D]roll
[D]Whatever my [G]lot, Thou hast [D]taught me to say
[G]It is [D]well, it is [A]well with my [D]soul`],
      ['Chorus', `
[D]It is well [G]with my [D]soul
[G]It is [A]well, it is well with my [D]soul`],
      ['Verse 2', `
[D]Though Satan should [G]buffet, though [D]trials should come
[D]Let this blest as[A]surance con[D]trol
[D]That Christ hath re[G]garded my [D]helpless estate
[G]And hath [D]shed His own [A]blood for my [D]soul`],
    ]),
    hymn('Be Thou My Vision', 'Traditional Irish', 'D', 'en', [
      ['Verse 1', `
[D]Be Thou my [G]vision, O [D]Lord of my heart
[D]Naught be all [G]else to me, [A]save that Thou [D]art
[D]Thou my best [G]thought, by [D]day or by night
[G]Waking or [D]sleeping, Thy [A]presence my [D]light`],
      ['Verse 2', `
[D]Be Thou my [G]wisdom, and [D]Thou my true Word
[D]I ever with [G]Thee and [A]Thou with me, [D]Lord
[D]Thou my great [G]Father, [D]I Thy true son
[G]Thou in me [D]dwelling, and [A]I with Thee [D]one`],
    ]),
    hymn('Come Thou Fount of Every Blessing', 'Robert Robinson', 'G', 'en', [
      ['Verse 1', `
[G]Come, Thou Fount of [C]every [G]blessing
[G]Tune my heart to [D]sing Thy [G]grace
[G]Streams of mercy, [C]never [G]ceasing
[G]Call for songs of [D]loudest [G]praise`],
      ['Verse 2', `
[G]Here I raise my [C]Eben[G]ezer
[G]Hither by Thy [D]help I'm [G]come
[G]And I hope, by [C]Thy good [G]pleasure
[G]Safely to ar[D]rive at [G]home`],
      ['Verse 3', `
[G]Prone to wander, [C]Lord, I [G]feel it
[G]Prone to leave the [D]God I [G]love
[G]Here's my heart, O [C]take and [G]seal it
[G]Seal it for Thy [D]courts a[G]bove`],
    ]),
    hymn('Blessed Assurance', 'Fanny Crosby', 'D', 'en', [
      ['Verse 1', `
[D]Blessed assurance, [G]Jesus is [D]mine
[D]Oh, what a fore[A]taste of glory di[D]vine
[D]Heir of salva[G]tion, pur[D]chase of God
[D]Born of His [A]Spirit, washed [D]in His blood`],
      ['Chorus', `
[D]This is my story, [G]this is my [D]song
[D]Praising my [A]Savior all the day [D]long
[D]This is my story, [G]this is my [D]song
[D]Praising my [A]Savior all the day [D]long`],
    ]),
    hymn('Great Is Thy Faithfulness', 'Thomas Chisholm', 'D', 'en', [
      ['Verse 1', `
[D]Great is Thy [G]faithfulness, [D]O God my Father
[D]There is no [A]shadow of [D]turning with Thee
[D]Thou changest [G]not, Thy compas[D]sions, they fail not
[G]As Thou hast [D]been Thou for[A]ever wilt [D]be`],
      ['Chorus', `
[D]Great is Thy [G]faithfulness, [D]great is Thy faithfulness
[D]Morning by [A]morning new [D]mercies I see
[D]All I have [G]needed Thy [D]hand hath provided
[G]Great is Thy [D]faithfulness, [A]Lord, unto [D]me`],
    ]),
    hymn('Rock of Ages', 'Augustus Toplady', 'G', 'en', [
      ['Verse 1', `
[G]Rock of Ages, [C]cleft for [G]me
[G]Let me hide my[D]self in [G]Thee
[G]Let the water [C]and the [G]blood
[G]From Thy wounded [D]side which [G]flowed
[G]Be of sin the [C]double [G]cure
[G]Save from wrath and [D]make me [G]pure`],
    ]),
    hymn('Nearer, My God, to Thee', 'Sarah Adams', 'G', 'en', [
      ['Verse 1', `
[G]Nearer, my God, to [C]Thee, [G]nearer to [D]Thee
[G]E'en though it be a [C]cross that [G]raiseth [D]me
[G]Still all my song shall [C]be, [G]nearer, my [D]God, to Thee
[G]Nearer, my God, to [D]Thee, [G]nearer to Thee`],
    ]),
    hymn('What a Friend We Have in Jesus', 'Joseph Scriven', 'G', 'en', [
      ['Verse 1', `
[G]What a friend we have in [C]Jesus, [G]all our sins and [D]griefs to bear
[G]What a privilege to [C]carry [G]everything to [D]God in prayer
[G]Oh, what peace we often [C]forfeit, [G]oh, what needless [D]pain we bear
[G]All because we do not [C]carry [G]everything to [D]God in [G]prayer`],
    ]),
    hymn("All Hail the Power of Jesus' Name", 'Edward Perronet', 'G', 'en', [
      ['Verse 1', `
[G]All hail the power of [C]Jesus' [G]name
[G]Let angels prostrate [D]fall
[G]Bring forth the royal [C]diadem
[G]And crown Him [D]Lord of [G]all
[G]Bring forth the royal [C]diadem
[G]And crown Him [D]Lord of [G]all`],
    ]),
    hymn('Joyful, Joyful, We Adore Thee', 'Henry van Dyke', 'G', 'en', [
      ['Verse 1', `
[G]Joyful, joyful, we a[C]dore Thee, [G]God of glory, [D]Lord of love
[G]Hearts unfold like [C]flowers be[G]fore Thee, [D]opening to the [G]sun above
[G]Melt the clouds of [C]sin and [G]sadness, [D]drive the dark of [G]doubt away
[G]Giver of im[C]mortal [G]gladness, [D]fill us with the [G]light of day`],
    ]),
    hymn('Praise to the Lord, the Almighty', 'Joachim Neander', 'D', 'en', [
      ['Verse 1', `
[D]Praise to the Lord, the Al[G]mighty, the [D]King of cre[A]ation
[D]O my soul, [G]praise Him, for [D]He is thy [A]health and sal[D]vation
[D]All ye who [G]hear, now to [D]His temple [A]draw near
[G]Join me in [D]glad ado[A]ra[D]tion`],
    ]),
    hymn('O for a Thousand Tongues to Sing', 'Charles Wesley', 'D', 'en', [
      ['Verse 1', `
[D]O for a thousand [G]tongues to [D]sing
[D]My great Re[A]deemer's [D]praise
[D]The glories of my [G]God and [D]King
[D]The triumphs [A]of His [D]grace`],
    ]),
    hymn('Just As I Am', 'Charlotte Elliott', 'G', 'en', [
      ['Verse 1', `
[G]Just as I am, with[C]out one [G]plea
[G]But that Thy blood was [D]shed for [G]me
[G]And that Thou bidd'st me [C]come to [G]Thee
[G]O Lamb of God, I [D]come, I [G]come`],
    ]),
    hymn('Joy to the World', 'Isaac Watts', 'D', 'en', [
      ['Verse 1', `
[D]Joy to the world! The [A]Lord is come
[D]Let earth re[A]ceive her [D]King
[D]Let every heart pre[A]pare Him room
[D]And heaven and nature [A]sing, and heaven and nature [D]sing
[G]And heaven, and [D]heaven and nature [A]sing[D]`],
    ]),
    hymn('Silent Night', 'Joseph Mohr', 'C', 'en', [
      ['Verse 1', `
[C]Silent night, holy [G]night
[G]All is calm, all is [C]bright
[C]Round yon virgin, mother and [F]Child
[C]Holy infant so [F]tender and [C]mild
[C]Sleep in heavenly [G]peace
[C]Sleep in heavenly [G]peace[C]`],
    ]),
    hymn('O Come, All Ye Faithful', 'John Francis Wade', 'G', 'en', [
      ['Verse 1', `
[G]O come, all ye [D]faithful, [G]joyful and tri[D]umphant
[G]O come ye, O [D]come ye to Beth[G]le[C]hem
[G]Come and behold [D]Him, born the King of [G]angels
[G]O come, let us a[D]dore Him, O come, let us a[G]dore Him
[C]O come, let us a[G]dore Him, [D]Christ the [G]Lord`],
    ]),
    hymn('When I Survey the Wondrous Cross', 'Isaac Watts', 'G', 'en', [
      ['Verse 1', `
[G]When I survey the [D]wondrous [G]cross
[G]On which the Prince of [D]glory [G]died
[G]My richest gain I [C]count but [G]loss
[G]And pour contempt on [D]all my [G]pride`],
    ]),
    hymn('Abide with Me', 'Henry Francis Lyte', 'D', 'en', [
      ['Verse 1', `
[D]Abide with me, fast [G]falls the [D]eventide
[D]The darkness deepens, [A]Lord, with me a[D]bide
[D]When other helpers [G]fail and [D]comforts flee
[G]Help of the [D]helpless, [A]O abide with [D]me`],
    ]),
    hymn('The Old Rugged Cross', 'George Bennard', 'C', 'en', [
      ['Verse 1', `
[C]On a hill far away stood an [F]old rugged [C]cross
[C]The emblem of [G]suffering and [C]shame
[C]And I love that old cross where the [F]dearest and [C]best
[C]For a world of lost [G]sinners was [C]slain`],
      ['Chorus', `
[C]So I'll cherish the old rugged [F]cross, [C]till my trophies at last I lay [G]down
[C]I will cling to the old rugged [F]cross, [C]and exchange it some day for a [G]crown`],
    ]),
    hymn('Doxology', 'Thomas Ken', 'G', 'en', [
      ['Verse', `
[G]Praise God, from [C]whom all [G]blessings flow
[G]Praise Him, all [D]creatures [G]here below
[G]Praise Him a[C]bove, ye [G]heavenly host
[G]Praise Father, [D]Son, and Holy [G]Ghost. A[D]men[G]`],
    ]),
  ];
}

/** Short Tagalog sample songs, translations of public-domain hymns. */
export function tagalogHymnSongs(): Song[] {
  return [
    hymn('Purihin ang Diyos', 'Doxology (salin sa Tagalog)', 'G', 'tl', [
      ['Verse', `
[G]Purihin ang Diyos na [C]pinagmu[G]lan
[G]Ng lahat ng biyaya't [D]kaloob [G]Niya
[G]Purihin Siya, sa [C]langit at [G]lupa
[G]Ama, Anak at Espiritu [D]Santo, A[G]min`],
    ]),
    hymn('Tahimik na Gabi', 'Silent Night (salin sa Tagalog)', 'C', 'tl', [
      ['Verse 1', `
[C]Tahimik na gabi, ba[G]nal na gabi
[G]Lahat ay payapa, [C]maliwanag
[C]Ang Inang birhen at [F]Sanggol na [C]banal
[C]Natutulog sa [F]kapayapaang [C]langit
[C]Natutulog sa [G]kapayapaang [C]langit`],
    ]),
    hymn('Biyayang Kahanga-hanga', 'Amazing Grace (salin sa Tagalog)', 'G', 'tl', [
      ['Verse 1', `
[G]Biyayang kahanga-[G7]hanga, [C]tamis ng [G]tinig
[G]Na nagligtas sa [Em]akin, [D]sa isang makasalanan
[G]Ako'y nawala, [G7]ngunit [C]ngayon ay na[G]tagpuan
[G]Ako'y bulag, ngunit [D]ngayon ay [G]nakakakita`],
    ]),
  ];
}

/** Every sample hymn, with fixed ids and times so a team update never shows one twice. */
const HYMN_TIME = Date.UTC(2026, 0, 1);
export const allHymns = (): Song[] =>
  [...hymnSongs(), ...tagalogHymnSongs()].map((s) => ({
    ...s,
    id: `demo-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    createdAt: HYMN_TIME,
    updatedAt: HYMN_TIME,
  }));
