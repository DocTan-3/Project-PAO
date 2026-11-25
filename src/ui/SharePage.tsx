import { useMemo, useState } from 'preact/hooks';
import { groupSongs } from '../model/library';
import { type MergePlan, exportFileName, exportSongs, parseSongsFile } from '../model/share';
import type { Song } from '../model/types';
import { Icon } from './icons';
import { shareTextFile } from './shareFile';
import { ThemeToggle } from './theme';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The message after receiving a file, in plain words. */
export function receivedMessage(plan: MergePlan, invalid: number): string {
  const parts: string[] = [];
  if (plan.added) parts.push(`${plural(plan.added, 'new song was', 'new songs were')} added.`);
  if (plan.updated) parts.push(`${plural(plan.updated, 'song was', 'songs were')} updated to the newer copy.`);
  if (!plan.added && !plan.updated) parts.push('Nothing new. You already have all of these songs.');
  else if (plan.unchanged) parts.push(`${plural(plan.unchanged, 'song was', 'songs were')} already up to date.`);
  if (invalid) parts.push(`${plural(invalid, 'song', 'songs')} could not be read and ${invalid === 1 ? 'was' : 'were'} skipped.`);
  return parts.join(' ');
}

/** Send songs to a friend, or receive songs from one, as a file. Two big buttons, in plain words. */
export function SharePage({
  songs,
  onMenu,
  onImport,
}: {
  songs: Song[];
  onMenu: () => void;
  onImport: (incoming: Song[]) => Promise<MergePlan>;
}) {
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [received, setReceived] = useState<{ ok: boolean; text: string } | null>(null);

  const groups = useMemo(
    () => [
      { label: 'English', songs: groupSongs(songs, 'en').flatMap((g) => g.songs) },
      { label: 'Tagalog', songs: groupSongs(songs, 'tl').flatMap((g) => g.songs) },
    ].filter((g) => g.songs.length > 0),
    [songs],
  );

  // nothing chosen yet = send everything
  const chosen = choosing && picked.size > 0 ? songs.filter((s) => picked.has(s.id)) : songs;
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const send = async () => {
    setSendNote(null);
    setSendError(null);
    setBusy(true);
    try {
      const out = await shareTextFile(exportFileName(), exportSongs(chosen), 'BPCG - PAW songs');
      if (out === 'saved') setSendNote('The songs were saved as a file in your Downloads folder. Send that file to your friend.');
      else if (out === 'shared') setSendNote('Sent. Ask your friend to tap Receive songs in their app.');
    } catch {
      setSendError('Sorry, the songs could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const receive = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // so the same file can be chosen again
    if (!file) return;
    setReceived(null);
    setBusy(true);
    try {
      const parsed = parseSongsFile(await file.text());
      if (!parsed.ok) {
        setReceived({ ok: false, text: parsed.error });
        return;
      }
      const plan = await onImport(parsed.songs);
      setReceived({ ok: true, text: receivedMessage(plan, parsed.invalid) });
    } catch {
      setReceived({ ok: false, text: 'Sorry, that file could not be opened.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="library share-page">
      <div class="lib-pinned page-pinned">
        <div class="lib-top">
          <div class="brand">
            <button class="btn icon ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
            Share by file
          </div>
          <ThemeToggle />
        </div>
      </div>

      <section class="share-card" aria-labelledby="send-h">
        <h2 id="send-h">Send my songs</h2>
        <p class="share-lead">
          {songs.length === 0
            ? 'You have no songs to send yet.'
            : choosing && picked.size > 0
              ? `Send ${plural(chosen.length, 'song', 'songs')} to a friend.`
              : `Send all ${plural(songs.length, 'song', 'songs')} to a friend.`}
        </p>
        <button class="btn primary big" id="send-btn" onClick={send} disabled={busy || songs.length === 0}>
          <Icon name="share" size={24} />
          Send songs
        </button>
        <ol class="steps">
          <li>Tap <b>Send songs</b>.</li>
          <li>Choose <b>Quick Share</b> or <b>Bluetooth</b>.</li>
          <li>Tap your friend’s phone.</li>
        </ol>
        {sendNote && <p class="share-note ok" role="status">{sendNote}</p>}
        {sendError && <p class="share-note bad" role="alert">{sendError}</p>}

        {songs.length > 1 && (
          <>
            <button class="linkbtn" id="choose-btn" aria-expanded={choosing} onClick={() => setChoosing((c) => !c)}>
              {choosing ? 'Send all my songs instead' : 'Choose which songs to send'}
            </button>
            {choosing && (
              <div class="pick-box">
                <div class="pick-actions">
                  <button class="btn sm" onClick={() => setPicked(new Set(songs.map((s) => s.id)))}>Select all</button>
                  <button class="btn sm" onClick={() => setPicked(new Set())}>Clear</button>
                  <span class="muted">{picked.size === 0 ? 'None chosen: all will be sent' : `${picked.size} chosen`}</span>
                </div>
                {groups.map((g) => (
                  <div key={g.label}>
                    <h3 class="pick-group">{g.label}</h3>
                    <ul class="pick-list">
                      {g.songs.map((s) => (
                        <li key={s.id}>
                          <label class="pick-row">
                            <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                            <span>
                              <span class="t">{s.title || 'Untitled'}</span>
                              <span class="a">{s.artist || 'No artist'}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section class="share-card" aria-labelledby="recv-h">
        <h2 id="recv-h">Receive songs</h2>
        <p class="share-lead">Get songs from a friend’s phone.</p>
        <label class={`btn primary big${busy ? ' disabled' : ''}`} id="receive-label">
          <Icon name="download" size={24} />
          Receive songs
          <input id="receive-input" class="file-input" type="file" disabled={busy} onChange={receive} aria-label="Receive songs: choose the file your friend sent" />
        </label>
        <ol class="steps">
          <li>Ask your friend to tap <b>Send songs</b> and choose your phone.</li>
          <li>Accept the file when your phone asks.</li>
          <li>Tap <b>Receive songs</b> here and choose the file that says <b>BPCG-PAW-songs</b>.</li>
        </ol>
        {received && (
          <p class={`share-note ${received.ok ? 'ok' : 'bad'}`} role={received.ok ? 'status' : 'alert'}>{received.text}</p>
        )}
        <p class="muted small-print">If you already have a song, the newest copy is kept.</p>
      </section>
    </main>
  );
}
