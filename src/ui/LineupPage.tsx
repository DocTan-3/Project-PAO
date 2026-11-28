import { useState } from 'preact/hooks';
import { publishLineups } from '../admin/admin';
import { packErrorText } from '../admin/github';
import {
  type Lineup,
  SLOT_GROUPS,
  type SlotKey,
  PEOPLE_FIELDS,
  assignSlot,
  copyPeople,
  copySource,
  hasPeople,
  isCopied,
  peopleOf,
  setPerson,
  formatDate,
  isISODate,
  lineupEntries,
  progressLabel,
  setLineupDate,
  slotLabel,
  teamLabel,
  type CopyKind,
} from '../model/lineup';
import { languageOf } from '../model/library';
import type { Song } from '../model/types';
import { Icon } from './icons';
import { SongPicker } from './SongPicker';

/**
 * Song Leader, musicians and backup singers of one song. The admin types the names; everyone else just reads them.
 * From the second song on, the musicians (and, separately, the backup singers) can be copied from an earlier song.
 */
function People({ lineup, slot, pair, readOnly, onChange }: { lineup: Lineup; slot: SlotKey; pair?: string; readOnly: boolean; onChange: (l: Lineup) => void }) {
  const p = peopleOf(lineup, slot);
  if (readOnly) {
    if (!hasPeople(lineup, slot)) return null;
    return (
      <dl class="people ro" id={`people-${slot}`}>
        {pair && <dt class="people-title">{pair} team</dt>}
        {PEOPLE_FIELDS.filter((f) => p[f.key].trim() !== '').map((f) => (
          <div key={f.key}>
            <dt>{f.label}</dt>
            <dd>{p[f.key]}</dd>
          </div>
        ))}
      </dl>
    );
  }
  const copyBtn = (kind: CopyKind, noun: string) => {
    const from = copySource(lineup, slot, kind);
    if (!from) return null;
    const done = isCopied(lineup, slot, kind);
    return (
      <button
        type="button"
        class={`copy-btn${done ? ' done' : ''}`}
        id={`copy-${kind}-${slot}`}
        aria-pressed={done}
        onClick={() => onChange(copyPeople(lineup, slot, kind))}
      >
        {done ? `${noun} copied from ${teamLabel(from)}` : `Copy ${noun.toLowerCase()} from ${teamLabel(from)}`}
      </button>
    );
  };
  const field = (key: (typeof PEOPLE_FIELDS)[number], wide = false) => (
    <div class={`pf${wide ? ' wide' : ''}`} key={key.key}>
      <label for={`ppl-${slot}-${key.key}`}>{key.label}</label>
      <input
        id={`ppl-${slot}-${key.key}`}
        type="text"
        value={p[key.key]}
        maxLength={80}
        placeholder="Type a name"
        autocomplete="off"
        onInput={(e) => onChange(setPerson(lineup, slot, key.key, (e.currentTarget as HTMLInputElement).value))}
      />
    </div>
  );
  const [leader, keys, guitar, bass, drums, backup] = PEOPLE_FIELDS;
  return (
    <div class="people" id={`people-${slot}`}>
      {pair && <h3 class="people-title">{pair} team (both songs)</h3>}
      {field(leader!, true)}
      {copyBtn('musicians', 'Musicians')}
      {[keys!, guitar!, bass!, drums!].map((f) => field(f))}
      {copyBtn('backup', 'Backup singers')}
      {field(backup!, true)}
    </div>
  );
}

/** One line up: the date and the opening, welcome, praise and worship songs. */
export function LineupPage({
  lineup,
  songs,
  onChange,
  onBack,
  onOpenSong,
  onDelete,
  readOnly = false,
  publish,
}: {
  lineup: Lineup;
  songs: Song[];
  onChange: (l: Lineup) => void;
  onBack: () => void;
  /** open the song at this position of the line up (its service order) */
  onOpenSong: (index: number) => void;
  onDelete: () => void;
  /** view only: no changing the date or songs, no delete (phones that are not the admin) */
  readOnly?: boolean;
  /** the admin's Update button next to Start: publishes all line ups, then calls onDone */
  publish?: { lineups: Lineup[]; onDone: (count: number) => void };
}) {
  const [picking, setPicking] = useState<SlotKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);
  const doPublish = async () => {
    if (!publish) return;
    setPubError(null);
    setPubBusy(true);
    try {
      const r = await publishLineups(publish.lineups);
      if (r.ok) publish.onDone(r.count);
      else setPubError(r.reason === 'empty' ? 'There are no line ups to update.' : 'Another phone is now the admin. This phone is back to normal.');
    } catch (e) {
      setPubError(packErrorText(e));
    } finally {
      setPubBusy(false);
    }
  };
  const byId = new Map(songs.map((s) => [s.id, s]));
  const entries = lineupEntries(lineup, songs);
  const used = new Set(entries.map((e) => e.song.id));
  const indexOf = (key: SlotKey) => entries.findIndex((e) => e.key === key);

  const pickerLanguage = () => {
    const cur = picking ? byId.get(lineup.slots[picking] ?? '') : undefined;
    if (cur) return languageOf(cur);
    try {
      return localStorage.getItem('pao:lang') === 'tl' ? 'tl' : 'en';
    } catch {
      return 'en';
    }
  };

  return (
    <div class="lineup-page">
      <header class="topbar lineup-head">
        <span class="lh-left"><button class="btn icon ghost" onClick={onBack} aria-label="Back to line ups"><Icon name="back" /></button></span>
        <div class="titles">
          <h1>Line up</h1>
          <p>{progressLabel(entries)}</p>
        </div>
        <span class="lh-right">
          {publish && !readOnly && (
            <button class="btn publish-btn" id="publish-lineup-header" onClick={doPublish} disabled={pubBusy} aria-label="Update line ups for everyone">
              <Icon name="share" size={18} />
              <span class="lbl">{pubBusy ? 'Updating…' : 'Update'}</span>
            </button>
          )}
        <button
          class="btn primary start-btn"
          disabled={entries.length === 0}
          onClick={() => onOpenSong(0)}
          aria-label="Open the first song"
        >
          <Icon name="play" size={20} />
          <span class="lbl">Start</span>
        </button>
        </span>
      </header>

      {pubError && <p class="share-note bad" role="alert" id="publish-error">{pubError}</p>}

      <section class="card date-card">
        {readOnly ? (
          <span class="ctl-label on">Service date</span>
        ) : (
          <label class="date-field">
            <span class="ctl-label on">Service date</span>
            <input
              id="lineup-date"
              type="date"
              value={isISODate(lineup.date) ? lineup.date : ''}
              onInput={(e) => {
                const v = (e.currentTarget as HTMLInputElement).value;
                if (isISODate(v)) onChange(setLineupDate(lineup, v));
              }}
            />
          </label>
        )}
        <p class="date-long">{formatDate(lineup.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </section>

      {SLOT_GROUPS.filter((g) => !(readOnly && g.optional && g.slots.every((s) => !lineup.slots[s.key]))).map((g) => (
        <section class="card slot-group" key={g.title} aria-label={g.title}>
          <h2>
            {g.title}
            {g.slots.length > 1 && <span class="muted"> · {g.slots.length} songs</span>}
          </h2>
          {g.slots.map((slot) => {
            const id = lineup.slots[slot.key];
            const song = id ? byId.get(id) : undefined;
            const missing = !!id && !song;
            return (
              <div class="slot-wrap" key={slot.key}>
              <div class="slot">
                {song ? (
                  <>
                    <button class="slot-main" onClick={() => onOpenSong(indexOf(slot.key))} aria-label={`Open ${song.title}, ${slot.label}`}>
                      <span class="keybadge sm">{song.key ?? '–'}</span>
                      <span class="slot-text">
                        {g.slots.length > 1 && <span class="slot-label">{slot.label}</span>}
                        <span class="t">{song.title || 'Untitled'}</span>
                        <span class="a">{song.artist || 'No artist'}</span>
                      </span>
                    </button>
                    {!readOnly && (
                      <>
                        <button class="btn icon ghost" onClick={() => setPicking(slot.key)} aria-label={`Change ${slot.label}`} title="Change song">
                          <Icon name="swap" size={20} />
                        </button>
                        <button class="btn icon ghost" onClick={() => onChange(assignSlot(lineup, slot.key, null))} aria-label={`Remove ${slot.label}`} title="Remove song">
                          <Icon name="close" size={20} />
                        </button>
                      </>
                    )}
                  </>
                ) : readOnly ? (
                  <div class="slot-readonly">
                    {g.slots.length > 1 && <span class="slot-label">{slot.label}</span>}
                    <span class="t">{missing ? 'This song is not on your phone yet. Tap Update songs.' : 'No song chosen yet'}</span>
                  </div>
                ) : (
                  <button class="slot-empty" onClick={() => setPicking(slot.key)} aria-label={`Choose ${slot.label}`}>
                    <Icon name="plus" size={20} />
                    <span>
                      {g.slots.length > 1 && <span class="slot-label">{slot.label}</span>}
                      <span class="t">{missing ? 'That song was deleted. Choose another' : 'Choose a song'}</span>
                    </span>
                  </button>
                )}
              </div>
              </div>
            );
          })}
          {g.slots.some((sl) => byId.has(lineup.slots[sl.key] ?? '')) && (
            <People lineup={lineup} slot={g.slots[0]!.key} pair={g.slots.length > 1 ? g.title : undefined} readOnly={readOnly} onChange={onChange} />
          )}
        </section>
      ))}

      {!readOnly && (
      <div class="danger-zone">
        {confirmDelete ? (
          <div class="confirm" role="alertdialog" aria-label="Confirm delete">
            <span>Delete this line up for good?</span>
            <button class="btn danger" onClick={onDelete}>Delete line up</button>
            <button class="btn" onClick={() => setConfirmDelete(false)}>Keep it</button>
          </div>
        ) : (
          <button class="btn danger" onClick={() => setConfirmDelete(true)}>Delete this line up</button>
        )}
      </div>
      )}

      {picking && !readOnly && (
        <SongPicker
          title={`Choose ${slotLabel(picking)}`}
          songs={songs}
          usedIds={used}
          initialLanguage={pickerLanguage()}
          onClose={() => setPicking(null)}
          onPick={(s) => {
            onChange(assignSlot(lineup, picking, s.id));
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
