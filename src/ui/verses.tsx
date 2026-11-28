import { useEffect, useState } from 'preact/hooks';

/** The Bible verses shown around the app. */
export const VERSES = {
  splash: 'Psalms 100:4 - Enter His gates with thanksgiving and His courts with praise; give thanks to Him and praise His name.',
  songs: 'Colossians 3:16 - Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit, singing to God with gratitude in your hearts.',
  lineups: '1 Peter 4:10 - Each of you should use whatever gift you have received to serve others, as faithful stewards of God’s grace in its various forms.',
  favorites: 'John 15:16 - You did not choose Me, but I chose you and appointed you so that you might go and bear fruit—fruit that will last. Then the Father will give you whatever you ask in My name.',
  chords: 'Colossians 3:23 - Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
  settings: 'Psalms 34:3 - Glorify the Lord with me; let us exalt His name forever.',
} as const;

/** A verse in small italic type, centred. */
export function Verse({ text, id }: { text: string; id?: string }) {
  return <p class="verse" id={id}>{text}</p>;
}

// shown once each time the app starts, never again while it stays open
let shown = false;

/** The opening screen: a verse for about three seconds (tap to skip), then the app. */
export function Splash() {
  // automated browsers (the tests) skip it
  const skip = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const [open, setOpen] = useState(!shown && !skip);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (!open) return;
    shown = true;
    const a = setTimeout(() => setFading(true), 2700);
    const b = setTimeout(() => setOpen(false), 3000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [open]);
  if (!open) return null;
  return (
    <div class={`splash${fading ? ' fade' : ''}`} id="splash" role="status" onClick={() => setOpen(false)}>
      <p>{VERSES.splash}</p>
    </div>
  );
}
