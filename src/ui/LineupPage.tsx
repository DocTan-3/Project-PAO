import { useState } from 'preact/hooks';
import {
  type Lineup,
  SLOT_GROUPS,
  type SlotKey,
  assignSlot,
  formatDate,
  isISODate,
  lineupEntries,
  setLineupDate,
  slotLabel,
} from '../model/lineup';
import { languageOf } from '../model/library';
import type { Song } from '../model/types';
import { Icon } from './icons';
import { SongPicker } from './SongPicker';

/** One line up: the date and the opening, welcome, praise and worship songs. */
export function LineupPage({
  lineup,
  songs,
  onChange,
  onBack,
  onOpenSong,
  onDelete,
}: {
  lineup: Lineup;
  songs: Song[];
  onChange: (l: Lineup) => void;
  onBack: () => void;
  /** open the song at this position of the line up (its service order) */
  onOpenSong: (index: number) => void;
  onDelete: () => void;
}) {
  const [picking, setPicking] = useState<SlotKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const byId = new Map(songs.map((s) => [s.id, s]));
  const entries = lineupEntries(lineup, songs);
  const used = new Set(entries.map((e) => e.song.id));
  const indexOf = (key: SlotKey) => entries.findIndex((e) => e.key === key);
  const total = 6;

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
      <header class="topbar">
        <button class="btn icon ghost" onClick={onBack} aria-label="Back to line ups"><Icon name="back" /></button>
        <div class="titles">
          <h1>Line up</h1>
          <p>{entries.length} of {total} songs</p>
        </div>
        <button
          class="btn primary start-btn"
          disabled={entries.length === 0}
          onClick={() => onOpenSong(0)}
          aria-label="Open the first song"
        >
          <Icon name="play" size={20} />
          <span class="lbl">Start</span>
        </button>
      </header>

      <section class="card date-card">
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
        <p class="date-long">{formatDate(lineup.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </section>

      {SLOT_GROUPS.map((g) => (
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
              <div class="slot" key={slot.key}>
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
                    <button class="btn icon ghost" onClick={() => setPicking(slot.key)} aria-label={`Change ${slot.label}`} title="Change song">
                      <Icon name="swap" size={20} />
                    </button>
                    <button class="btn icon ghost" onClick={() => onChange(assignSlot(lineup, slot.key, null))} aria-label={`Remove ${slot.label}`} title="Remove song">
                      <Icon name="close" size={20} />
                    </button>
                  </>
                ) : (
                  <button class="slot-empty" onClick={() => setPicking(slot.key)} aria-label={`Choose ${slot.label}`}>
                    <Icon name="plus" size={20} />
                    <span>
                      {g.slots.length > 1 && <span class="slot-label">{slot.label}</span>}
                      <span class="t">{missing ? 'That song was deleted. Choose another' : `Choose ${g.slots.length > 1 ? 'a song' : g.title.toLowerCase()}`}</span>
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}

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

      {picking && (
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
