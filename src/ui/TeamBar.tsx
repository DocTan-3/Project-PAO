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
  whenLong,
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
  if (missingSongs > 0) parts.push(`${plural(missingSongs, 'song in these line ups is', 'songs in these line ups are')} not on your phone yet. Update on the Songs screen.`);
  return parts.join(' ');
}

type Note = { ok: boolean; text: string } | null;

// =====================================================================================================
// Songs: an Update button and a centred status line under the tabs.
// =====================================================================================================

export function useSongsTeam(songs: Song[], onUpdate: (pack: Song[]) => Promise<UpdatePlan>) {
  const admin = useAdmin();
  const lost = useLostAdminNotice();
  const notice = useUpdateNotice();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [lastUpd, setLastUpd] = useState<number | null>(lastUpdateAt);
  const [, bump] = useState(0);

  const update = async () => {
    setNote(null);
    setBusy(true);
    try {
      const parsed = parseSongsFile(await fetchFileText(GIST_FILE));
      if (!parsed.ok) setNote({ ok: false, text: 'The team songs are not ready yet. Ask the admin to update them.' });
      else if (parsed.songs.length === 0) setNote({ ok: false, text: 'The admin has not added any songs yet.' });
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
      if (r.ok) setNote({ ok: true, text: `Updated ${plural(r.count, 'song', 'songs')}. Everyone gets them when they tap Update.` });
      else if (r.reason === 'empty') setNote({ ok: false, text: 'There are no songs to update.' });
    } catch (e) {
      setNote({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  };

  return { songs, admin, lost, notice, busy, note, lastUpd, update, publish };
}
export type SongsTeam = ReturnType<typeof useSongsTeam>;

/** The ✨ADMIN✨ badge, shown at the right of the screen title on the admin phone. */
export function AdminBadge() {
  const admin = useAdmin();
  if (!updatesAvailable || !admin) return null;
  return <span class="badge admin-badge" id="admin-badge" aria-label="Admin">
      <Icon name="sparkles" size={12} />
      ADMIN
      <Icon name="sparkles" size={12} />
    </span>;
}

/** The Update button under the language tabs (on the admin phone it sends the songs to everyone). */
export function SongsPill({ team }: { team: SongsTeam }) {
  if (!updatesAvailable) return null;
  return team.admin ? (
    <button class="btn update-bar primary" id="publish-btn" onClick={team.publish} disabled={team.busy || team.songs.length === 0} aria-label="Update songs for everyone">
      <Icon name="upload" size={18} />
      <span class="lbl">{team.busy ? 'Updating…' : 'Update'}</span>
    </button>
  ) : (
    <button class={`btn update-bar${team.notice.songs ? ' primary' : ''}`} id="update-btn" onClick={team.update} disabled={team.busy} aria-label="Update songs from the team">
      <Icon name="download" size={18} />
      <span class="lbl">{team.busy ? 'Updating…' : 'Update'}</span>
    </button>
  );
}

/** What the notice says: how many songs or line ups the admin has added. */
const addedText = (n: number, one: string, many: string, fallback: string): string =>
  n > 0 ? `The admin has added ${plural(n, one, many)} to the app.` : fallback;

/** The centred status line under the tabs: what is new, when things were last updated, and results. */
export function SongsStatus({ team }: { team: SongsTeam }) {
  if (!updatesAvailable) return null;
  const published = lastPublished();
  return (
    <div class="team-line" aria-live="polite">
      {team.lost && <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>}
      {team.admin ? (
        <p class="team-status" id="publish-status">
          {published ? `Songs are updated last ${whenLong(published.at)}. ` : 'Songs not yet updated.'}
          {published && (hasUnpublishedChanges(team.songs) ? 'Changes not updated yet.' : 'Everything is updated.')}
        </p>
      ) : team.notice.songs ? (
        <p class="share-note ok notice" role="status" id="songs-notice">{addedText(team.notice.songsCount, 'song', 'songs', 'The admin has updated the songs.')}</p>
      ) : (
        <p class="team-status" id="songs-updated">
          {team.lastUpd ? `Songs are updated last ${whenLong(team.lastUpd)}. Everything is updated.` : 'Update to get the latest songs from the team.'}
        </p>
      )}
      {team.note && <p class={`share-note ${team.note.ok ? 'ok' : 'bad'}`} role={team.note.ok ? 'status' : 'alert'} id={team.admin ? 'publish-note' : 'update-note'}>{team.note.text}</p>}
    </div>
  );
}

// =====================================================================================================
// Line ups: an Update button and a centred status line under the tabs (the admin's New button floats bottom right).
// =====================================================================================================

export function useLineupsTeam(
  songs: Song[],
  lineups: Lineup[],
  onUpdate: (pack: Lineup[]) => Promise<LineupUpdatePlan>,
  onPublished: () => void,
) {
  const admin = useAdmin();
  const lost = useLostAdminNotice();
  const notice = useUpdateNotice();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [last, setLast] = useState<number | null>(lastLineupsUpdateAt);
  const [, bump] = useState(0);

  const update = async () => {
    setNote(null);
    setBusy(true);
    try {
      const parsed = parseLineupsFile(await fetchFileText(LINEUPS_FILE));
      if (!parsed.ok) setNote({ ok: false, text: parsed.error });
      else if (parsed.lineups.length === 0) setNote({ ok: false, text: 'The admin has not added any line ups yet.' });
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
      setNote({ ok: false, text: kind === 'missing' ? 'The admin has not added any line ups yet.' : packErrorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setNote(null);
    setBusy(true);
    try {
      const r = await publishLineups(lineups);
      if (r.ok) {
        setNote({ ok: true, text: `Updated ${plural(r.count, 'line up', 'line ups')}. Everyone gets them when they tap Update.` });
        onPublished();
      } else if (r.reason === 'empty') setNote({ ok: false, text: 'There are no line ups to update.' });
    } catch (e) {
      setNote({ ok: false, text: packErrorText(e) });
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  };

  return { lineups, admin, lost, notice, busy, note, last, update, publish };
}
export type LineupsTeam = ReturnType<typeof useLineupsTeam>;

/** The Update button under the Line up tabs (on the admin phone it sends the line ups to everyone). */
export function LineupPills({ team, canEdit }: { team: LineupsTeam; canEdit: boolean }) {
  if (canEdit) {
    return updatesAvailable ? (
      <button class="btn update-bar primary" id="publish-lineups-btn" onClick={team.publish} disabled={team.busy || team.lineups.length === 0} aria-label="Update line ups for everyone">
        <Icon name="upload" size={18} />
        <span class="lbl">{team.busy ? 'Updating…' : 'Update'}</span>
      </button>
    ) : null;
  }
  return (
    <button class={`btn update-bar${team.notice.lineups ? ' primary' : ''}`} id="update-lineups-btn" onClick={team.update} disabled={team.busy} aria-label="Update line ups from the admin">
      <Icon name="download" size={18} />
      <span class="lbl">{team.busy ? 'Updating…' : 'Update'}</span>
    </button>
  );
}

/** The centred status line under the Line up tabs. */
export function LineupStatus({ team, canEdit }: { team: LineupsTeam; canEdit: boolean }) {
  if (!updatesAvailable) return null;
  const published = lastPublishedLineups();
  return (
    <div class="team-line" aria-live="polite">
      {team.lost && <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>}
      {canEdit ? (
        <p class="team-status" id="publish-lineups-status">
          {published ? `Line ups are updated last ${whenLong(published.at)}. ` : 'Line ups not yet updated.'}
          {published && (hasUnpublishedLineupChanges(team.lineups) ? 'Changes not updated yet.' : 'Everything is updated.')}
        </p>
      ) : team.notice.lineups ? (
        <p class="share-note ok notice" role="status" id="lineups-notice">{addedText(team.notice.lineupsCount, 'line up', 'line ups', 'The admin has updated the line ups.')}</p>
      ) : (
        <p class="team-status" id="lineups-updated">
          {team.last ? `Line ups are updated last ${whenLong(team.last)}. Everything is updated.` : 'Update to get the latest line ups from the admin.'}
        </p>
      )}
      {team.note && <p class={`share-note ${team.note.ok ? 'ok' : 'bad'}`} role={team.note.ok ? 'status' : 'alert'} id="lineups-note">{team.note.text}</p>}
    </div>
  );
}
