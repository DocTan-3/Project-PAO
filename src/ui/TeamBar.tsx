import { useState } from 'preact/hooks';
import {
  hasUnpublishedChanges,
  hasUnpublishedLineupChanges,
  lastLineupsUpdateAt,
  lastPublished,
  lastPublishedLineups,
  lastUpdateAt,
  markLineupsUpdated,
  markUpdated,
  publishLineups,
  publishSongs,
  setSeenSignature,
  useAdmin,
  useLostAdminNotice,
  whenText,
} from '../admin/admin';
import { GIST_FILE, LINEUPS_FILE, updatesAvailable } from '../admin/config';
import { fetchFileText, packErrorText } from '../admin/github';
import { clearNotice, useUpdateNotice } from '../admin/notice';
import { type Lineup, missingSongIds } from '../model/lineup';
import { type LineupUpdatePlan, parseLineupsFile } from '../model/lineupShare';
import { packSignature, type UpdatePlan } from '../model/pack';
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

/** The message after updating line ups. */
export function updatedLineupsMessage(plan: LineupUpdatePlan, missingSongs: number): string {
  const parts: string[] = [];
  if (plan.added) parts.push(`${plural(plan.added, 'new line up was', 'new line ups were')} added.`);
  if (plan.updated) parts.push(`${plural(plan.updated, 'line up was', 'line ups were')} updated.`);
  if (plan.removed) parts.push(`${plural(plan.removed, 'line up was', 'line ups were')} removed because the admin no longer has ${plan.removed === 1 ? 'it' : 'them'}.`);
  if (!plan.added && !plan.updated && !plan.removed) parts.unshift('You already have the latest line ups.');
  else parts.unshift('Done!');
  if (missingSongs > 0) parts.push(`${plural(missingSongs, 'song in these line ups is', 'songs in these line ups are')} not on your phone yet. Tap Update songs on the Songs screen.`);
  return parts.join(' ');
}

type Note = { ok: boolean; text: string } | null;

/**
 * The team's songs, on the Songs screen. Everyone gets an "Update songs" button; the admin phone gets
 * "Publish songs" instead. Shown only when the app has been set up with a team Gist.
 */
export function TeamBar({ songs, onUpdate }: { songs: Song[]; onUpdate: (pack: Song[]) => Promise<UpdatePlan> }) {
  const admin = useAdmin();
  const lost = useLostAdminNotice();
  const notice = useUpdateNotice();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [lastUpd, setLastUpd] = useState<number | null>(lastUpdateAt);
  const [, bump] = useState(0);

  if (!updatesAvailable) return null;

  const update = async () => {
    setNote(null);
    setBusy(true);
    try {
      const parsed = parseSongsFile(await fetchFileText(GIST_FILE));
      if (!parsed.ok) setNote({ ok: false, text: 'The team songs are not ready yet. Ask the admin to publish them.' });
      else if (parsed.songs.length === 0) setNote({ ok: false, text: 'The team has not published any songs yet.' });
      else {
        const plan = await onUpdate(parsed.songs);
        markUpdated();
        setSeenSignature('songs', packSignature(parsed.songs));
        clearNotice('songs');
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
      {lost && (
        <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>
      )}
      {admin ? (
        <>
          <button class="btn primary team-btn" id="publish-btn" onClick={publish} disabled={busy || songs.length === 0}>
            <Icon name="share" size={18} />
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
          {notice.songs && <p class="share-note ok notice" role="status" id="songs-notice">New songs are ready.</p>}
          <button class={`btn team-btn${notice.songs ? ' primary' : ''}`} id="update-btn" onClick={update} disabled={busy}>
            <Icon name="download" size={18} />
            {busy ? 'Updating…' : 'Update songs'}
          </button>
          <p class="team-status">{lastUpd ? `Last updated ${whenText(lastUpd)}.` : 'Get the latest songs from the team. Needs internet.'}</p>
        </>
      )}
      {note && <p class={`share-note ${note.ok ? 'ok' : 'bad'}`} role={note.ok ? 'status' : 'alert'} id={admin ? 'publish-note' : 'update-note'}>{note.text}</p>}
    </section>
  );
}

/**
 * On phones that are not the admin, this takes the place of "Create new line up": one big button that gets the
 * latest line ups from the admin. Line ups are view-only there.
 */
export function LineupUpdate({
  songs,
  onUpdate,
}: {
  songs: Song[];
  onUpdate: (pack: Lineup[]) => Promise<LineupUpdatePlan>;
}) {
  const lost = useLostAdminNotice();
  const notice = useUpdateNotice();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [last, setLast] = useState<number | null>(lastLineupsUpdateAt);

  const update = async () => {
    setNote(null);
    setBusy(true);
    try {
      const parsed = parseLineupsFile(await fetchFileText(LINEUPS_FILE));
      if (!parsed.ok) setNote({ ok: false, text: parsed.error });
      else if (parsed.lineups.length === 0) setNote({ ok: false, text: 'The admin has not published any line ups yet.' });
      else {
        const plan = await onUpdate(parsed.lineups);
        markLineupsUpdated();
        setSeenSignature('lineups', packSignature(parsed.lineups));
        clearNotice('lineups');
        setLast(Date.now());
        setNote({ ok: true, text: updatedLineupsMessage(plan, missingSongIds(parsed.lineups, songs).length) });
      }
    } catch (e) {
      const kind = (e as { kind?: string })?.kind;
      setNote({ ok: false, text: kind === 'missing' ? 'The admin has not published any line ups yet.' : packErrorText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="lineup-update">
      {lost && (
        <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>
      )}
      {notice.lineups && <p class="share-note ok notice" role="status" id="lineups-notice">New line ups are ready.</p>}
      <button class="btn primary create-btn" id="update-lineups-btn" onClick={update} disabled={busy}>
        <Icon name="download" size={22} />
        {busy ? 'Updating…' : 'Update line ups'}
      </button>
      <p class="team-status">{last ? `Last updated ${whenText(last)}.` : 'Get the latest line ups from the admin. Needs internet.'}</p>
      {note && <p class={`share-note ${note.ok ? 'ok' : 'bad'}`} role={note.ok ? 'status' : 'alert'} id="lineups-note">{note.text}</p>}
    </div>
  );
}

/** On the admin phone, under "Create new line up": publish the line ups to everyone. */
export function LineupPublish({ lineups, onPublished }: { lineups: Lineup[]; onPublished: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [, bump] = useState(0);
  if (!updatesAvailable) return null;

  const publish = async () => {
    setNote(null);
    setBusy(true);
    try {
      const r = await publishLineups(lineups);
      if (r.ok) {
        setNote({ ok: true, text: `Published ${plural(r.count, 'line up', 'line ups')}. Everyone gets them when they tap Update line ups.` });
        onPublished();
      }
    } catch (e) {
      setNote({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  };

  const published = lastPublishedLineups();
  return (
    <div class="team-bar admin" aria-label="Publish line ups">
      <button class="btn primary team-btn" id="publish-lineups-btn" onClick={publish} disabled={busy || lineups.length === 0}>
        <Icon name="share" size={18} />
        Publish line ups
        <span class="badge">Admin</span>
      </button>
      <p class="team-status" id="publish-lineups-status">
        {published ? `Last published ${whenText(published.at)}. ` : 'You have not published line ups yet. '}
        {published && (hasUnpublishedLineupChanges(lineups) ? 'You have changes that are not published yet.' : 'Everything is published.')}
      </p>
      {note && <p class={`share-note ${note.ok ? 'ok' : 'bad'}`} role={note.ok ? 'status' : 'alert'} id="lineups-note">{note.text}</p>}
    </div>
  );
}
