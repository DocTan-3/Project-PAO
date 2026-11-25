import { useEffect, useState } from 'preact/hooks';
import { hasUnpublishedChanges, lastPublished, lastUpdateAt, markUpdated, publishSongs, stillAdmin, useAdmin, whenText } from '../admin/admin';
import { updatesAvailable } from '../admin/config';
import { fetchPackText, packErrorText } from '../admin/github';
import type { UpdatePlan } from '../model/pack';
import { parseSongsFile } from '../model/share';
import type { Song } from '../model/types';
import { Icon } from './icons';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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

/**
 * The team's songs, on the Songs screen. Everyone gets an "Update songs" button; the admin phone gets
 * "Publish songs" instead. Shown only when the app has been set up with a team Gist.
 */
export function TeamBar({ songs, onUpdate }: { songs: Song[]; onUpdate: (pack: Song[]) => Promise<UpdatePlan> }) {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
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

  if (!updatesAvailable) return null;

  const update = async () => {
    setNote(null);
    setBusy(true);
    try {
      const parsed = parseSongsFile(await fetchPackText());
      if (!parsed.ok) setNote({ ok: false, text: 'The team songs are not ready yet. Ask the admin to publish them.' });
      else if (parsed.songs.length === 0) setNote({ ok: false, text: 'The team has not published any songs yet.' });
      else {
        const plan = await onUpdate(parsed.songs);
        markUpdated();
        setLastUpd(Date.now());
        setNote({ ok: true, text: updatedMessage(plan) });
      }
    } catch (e) {
      setNote({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setNote(null);
    setBusy(true);
    try {
      const r = await publishSongs(songs);
      if (r.ok) setNote({ ok: true, text: `Published ${plural(r.count, 'song', 'songs')}. Everyone gets them when they tap Update songs.` });
      else if (r.reason === 'empty') setNote({ ok: false, text: 'There are no songs to publish.' });
      else setLost(true);
    } catch (e) {
      setNote({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  };

  const published = lastPublished();
  return (
    <section class={`team-bar${admin ? ' admin' : ''}`} aria-label={admin ? 'Publish songs' : 'Update songs'}>
      {lost && !admin && (
        <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>
      )}
      {admin ? (
        <>
          <button class="btn primary team-btn" id="publish-btn" onClick={publish} disabled={busy || songs.length === 0}>
            <Icon name="share" size={22} />
            Publish songs
            <span class="badge">Admin</span>
          </button>
          <p class="team-status" id="publish-status">
            {published ? `Last published ${whenText(published.at)}. ` : 'You have not published yet. '}
            {published && (hasUnpublishedChanges(songs) ? 'You have changes that are not published yet.' : 'Everything is published.')}
          </p>
        </>
      ) : (
        <>
          <button class="btn team-btn" id="update-btn" onClick={update} disabled={busy}>
            <Icon name="download" size={22} />
            {busy ? 'Updating…' : 'Update songs'}
          </button>
          <p class="team-status">{lastUpd ? `Last updated ${whenText(lastUpd)}.` : 'Tap to get the latest songs from the team. You need internet.'}</p>
        </>
      )}
      {note && <p class={`share-note ${note.ok ? 'ok' : 'bad'}`} role={note.ok ? 'status' : 'alert'} id={admin ? 'publish-note' : 'update-note'}>{note.text}</p>}
    </section>
  );
}
