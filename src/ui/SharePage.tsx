import { useEffect, useMemo, useState } from 'preact/hooks';
import { hasUnpublishedChanges, lastPublished, lastUpdateAt, markUpdated, publishSongs, stillAdmin, useAdmin, whenText } from '../admin/admin';
import { updatesAvailable } from '../admin/config';
import { fetchPackText, packErrorText } from '../admin/github';
import { groupSongs } from '../model/library';
import type { UpdatePlan } from '../model/pack';
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

/** The message after an update from the team, in plain words. */
export function updatedMessage(plan: UpdatePlan): string {
  const parts: string[] = [];
  if (plan.added) parts.push(`${plural(plan.added, 'new song was', 'new songs were')} added.`);
  if (plan.updated) parts.push(`${plural(plan.updated, 'song was', 'songs were')} updated.`);
  if (plan.removed) parts.push(`${plural(plan.removed, 'song was', 'songs were')} removed because the team no longer uses ${plan.removed === 1 ? 'it' : 'them'}.`);
  if (plan.keptMine) parts.push(`${plural(plan.keptMine, 'song you changed was', 'songs you changed were')} kept as yours.`);
  if (!plan.added && !plan.updated && !plan.removed) parts.unshift('You already have the latest songs.');
  else parts.unshift('Done!');
  parts.push('Your own songs were not changed.');
  return parts.join(' ');
}

/** Update from the team (everyone), publish to the team (the admin phone), and send or receive songs by file. */
export function SharePage({
  songs,
  onMenu,
  onImport,
  onUpdate,
}: {
  songs: Song[];
  onMenu: () => void;
  onImport: (incoming: Song[]) => Promise<MergePlan>;
  onUpdate: (pack: Song[]) => Promise<UpdatePlan>;
}) {
  const admin = useAdmin();
  const [upd, setUpd] = useState<{ ok: boolean; text: string } | null>(null);
  const [pub, setPub] = useState<{ ok: boolean; text: string } | null>(null);
  const [lost, setLost] = useState(false);
  const [lastUpd, setLastUpd] = useState<number | null>(lastUpdateAt);
  const [, bump] = useState(0);

  // an admin phone checks that it is still the admin (another phone may have taken over)
  useEffect(() => {
    if (!admin) return;
    stillAdmin()
      .then((ok) => {
        if (!ok) setLost(true);
      })
      .catch(() => undefined);
  }, [admin]);

  const update = async () => {
    setUpd(null);
    setBusy(true);
    try {
      const parsed = parseSongsFile(await fetchPackText());
      if (!parsed.ok) setUpd({ ok: false, text: 'The team songs are not ready yet. Ask the admin to publish them.' });
      else if (parsed.songs.length === 0) setUpd({ ok: false, text: 'The team has not published any songs yet.' });
      else {
        const plan = await onUpdate(parsed.songs);
        markUpdated();
        setLastUpd(Date.now());
        setUpd({ ok: true, text: updatedMessage(plan) });
      }
    } catch (e) {
      setUpd({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setPub(null);
    setBusy(true);
    try {
      const r = await publishSongs(songs);
      if (r.ok) setPub({ ok: true, text: `Published ${plural(r.count, 'song', 'songs')}. Everyone gets them when they tap Update songs.` });
      else if (r.reason === 'empty') setPub({ ok: false, text: 'There are no songs to publish.' });
      else setLost(true);
    } catch (e) {
      setPub({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  };

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
            Share &amp; Update
          </div>
          <ThemeToggle />
        </div>
      </div>

      {lost && !admin && (
        <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>
      )}

      {updatesAvailable && !admin && (
        <section class="share-card" aria-labelledby="upd-h">
          <h2 id="upd-h">Update songs</h2>
          <p class="share-lead">Get the latest songs from the team.</p>
          <button class="btn primary big" id="update-btn" onClick={update} disabled={busy}>
            <Icon name="download" size={24} />
            Update songs
          </button>
          <p class="muted small-print">You need internet. {lastUpd ? `Last updated ${whenText(lastUpd)}.` : 'You have not updated yet.'}</p>
          {upd && <p class={`share-note ${upd.ok ? 'ok' : 'bad'}`} role={upd.ok ? 'status' : 'alert'} id="update-note">{upd.text}</p>}
        </section>
      )}

      {admin && (
        <section class="share-card admin-card" aria-labelledby="pub-h">
          <h2 id="pub-h">Publish songs <span class="badge">Admin</span></h2>
          <p class="share-lead">You are the admin. Everyone gets your {plural(songs.length, 'song', 'songs')} when they tap Update songs.</p>
          <button class="btn primary big" id="publish-btn" onClick={publish} disabled={busy || songs.length === 0}>
            <Icon name="share" size={24} />
            Publish songs
          </button>
          <p class="muted small-print" id="publish-status">
            {lastPublished() ? `Last published ${whenText(lastPublished()!.at)}.` : 'You have not published yet.'}
            {lastPublished() && hasUnpublishedChanges(songs) ? ' You have changes that are not published yet.' : ''}
            {!lastPublished() ? '' : !hasUnpublishedChanges(songs) ? ' Everything is published.' : ''}
          </p>
          {pub && <p class={`share-note ${pub.ok ? 'ok' : 'bad'}`} role={pub.ok ? 'status' : 'alert'} id="publish-note">{pub.text}</p>}
        </section>
      )}

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
