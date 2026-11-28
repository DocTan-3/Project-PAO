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
  if (missingSongs > 0) parts.push(`${plural(missingSongs, 'song in these line ups is', 'songs in these line ups are')} not on your phone yet. Tap Update on the Songs screen.`);
  return parts.join(' ');
}

type Note = { ok: boolean; text: string } | null;

// =====================================================================================================
// Songs: a small Update (or, on the admin phone, Publish) button in the top row, and a status line under the tabs.
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
      if (r.ok) setNote({ ok: true, text: `Published ${plural(r.count, 'song', 'songs')}. Everyone gets them when they tap Update.` });
      else if (r.reason === 'empty') setNote({ ok: false, text: 'There are no songs to publish.' });
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

/** The small button in the top row of the Songs screen. */
export function SongsPill({ team }: { team: SongsTeam }) {
  if (!updatesAvailable) return null;
  return team.admin ? (
    <button class="pill-btn primary" id="publish-btn" onClick={team.publish} disabled={team.busy || team.songs.length === 0} aria-label="Publish songs to everyone">
      <Icon name="share" size={18} />
      <span class="lbl">{team.busy ? 'Publishing…' : 'Publish'}</span>
    </button>
  ) : (
    <button class={`pill-btn${team.notice.songs ? ' primary' : ''}`} id="update-btn" onClick={team.update} disabled={team.busy} aria-label="Update songs from the team">
      <Icon name="download" size={18} />
      <span class="lbl lbl-upd">{team.busy ? 'Updating…' : 'Update'}</span>
    </button>
  );
}

/** The small status line under the tabs: when songs were last updated or published, notices and results. */
export function SongsStatus({ team }: { team: SongsTeam }) {
  if (!updatesAvailable) return null;
  const published = lastPublished();
  return (
    <div class="team-line" aria-live="polite">
      {team.lost && <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>}
      {team.admin ? (
        <p class="team-status" id="publish-status">
          <span class="badge">Admin</span>
          {published ? `Songs last published ${whenText(published.at)}. ` : 'Songs not published yet. '}
          {published && (hasUnpublishedChanges(team.songs) ? 'Changes not published yet.' : 'Everything is published.')}
        </p>
      ) : (
        <>
          {team.notice.songs && <p class="share-note ok notice" role="status" id="songs-notice">New songs are ready.</p>}
          <p class="team-status">{team.lastUpd ? `Last updated ${whenText(team.lastUpd)}.` : 'Tap Update to get the latest songs from the team (needs internet).'}</p>
        </>
      )}
      {team.note && <p class={`share-note ${team.note.ok ? 'ok' : 'bad'}`} role={team.note.ok ? 'status' : 'alert'} id={team.admin ? 'publish-note' : 'update-note'}>{team.note.text}</p>}
    </div>
  );
}

// =====================================================================================================
// Line ups: Create + Publish (admin) or Update (everyone else) in the top row, a status line under the tabs.
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

  const publish = async () => {
    setNote(null);
    setBusy(true);
    try {
      const r = await publishLineups(lineups);
      if (r.ok) {
        setNote({ ok: true, text: `Published ${plural(r.count, 'line up', 'line ups')}. Everyone gets them when they tap Update.` });
        onPublished();
      } else if (r.reason === 'empty') setNote({ ok: false, text: 'There are no line ups to publish.' });
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

/**
 * The small buttons in the top row of the Line up screen. The admin phone (or any phone when team updates are
 * not set up) gets "New", and the admin also gets "Publish". Every other phone gets "Update" instead.
 */
export function LineupPills({ team, canEdit, onCreate }: { team: LineupsTeam; canEdit: boolean; onCreate: () => void }) {
  return (
    <>
      {canEdit ? (
        <>
          <button class="pill-btn primary create-btn" onClick={onCreate} aria-label="Create new line up">
            <Icon name="plus" size={18} />
            <span class="lbl lbl-new">New</span>
          </button>
          {updatesAvailable && (
            <button class="pill-btn" id="publish-lineups-btn" onClick={team.publish} disabled={team.busy || team.lineups.length === 0} aria-label="Publish line ups to everyone">
              <Icon name="share" size={18} />
              <span class="lbl lbl-pub">{team.busy ? 'Publishing…' : 'Publish'}</span>
            </button>
          )}
        </>
      ) : (
        <button class="pill-btn primary" id="update-lineups-btn" onClick={team.update} disabled={team.busy} aria-label="Update line ups from the admin">
          <Icon name="download" size={18} />
          <span class="lbl lbl-upd">{team.busy ? 'Updating…' : 'Update'}</span>
        </button>
      )}
    </>
  );
}

/** The small status line under the Line up tabs. */
export function LineupStatus({ team, canEdit }: { team: LineupsTeam; canEdit: boolean }) {
  if (!updatesAvailable) return null;
  const published = lastPublishedLineups();
  return (
    <div class="team-line" aria-live="polite">
      {team.lost && <p class="share-note bad" role="alert" id="lost-note">Another phone is now the admin. This phone is back to normal.</p>}
      {canEdit ? (
        <p class="team-status" id="publish-lineups-status">
          <span class="badge">Admin</span>
          {published ? `Line ups last published ${whenText(published.at)}. ` : 'Line ups not published yet. '}
          {published && (hasUnpublishedLineupChanges(team.lineups) ? 'Changes not published yet.' : 'Everything is published.')}
        </p>
      ) : (
        <>
          {team.notice.lineups && <p class="share-note ok notice" role="status" id="lineups-notice">New line ups are ready.</p>}
          <p class="team-status">{team.last ? `Last updated ${whenText(team.last)}.` : 'Tap Update to get the latest line ups from the admin (needs internet).'}</p>
        </>
      )}
      {team.note && <p class={`share-note ${team.note.ok ? 'ok' : 'bad'}`} role={team.note.ok ? 'status' : 'alert'} id="lineups-note">{team.note.text}</p>}
    </div>
  );
}
