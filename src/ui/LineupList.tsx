import { useMemo, useState } from 'preact/hooks';
import { type Lineup, formatDate, groupLineups, isComplete, lineupEntries, progressLabel, todayISO } from '../model/lineup';
import type { Song } from '../model/types';
import { Icon } from './icons';
import { ThemeToggle } from './theme';
import { useHold } from './useHold';

export function LineupList({
  lineups,
  songs,
  onMenu,
  onOpen,
  onCreate,
  onDelete,
}: {
  lineups: Lineup[];
  songs: Song[];
  onMenu: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const hold = useHold((id) => setConfirmId(id));
  const { upcoming, past } = useMemo(() => groupLineups(lineups, todayISO()), [lineups]);

  const card = (l: Lineup) => {
    const entries = lineupEntries(l, songs);
    return (
      <li key={l.id} class="lib-item">
        {confirmId === l.id ? (
          <div class="confirm" role="alertdialog" aria-label={`Delete the ${formatDate(l.date)} line up?`}>
            <span>Delete the {formatDate(l.date)} line up for good?</span>
            <button class="btn danger" onClick={() => { setConfirmId(null); onDelete(l.id); }}>Delete</button>
            <button class="btn" onClick={() => setConfirmId(null)}>Keep it</button>
          </div>
        ) : (
          <button
            class={`lineup-card${hold.pressing === l.id ? ' pressing' : ''}`}
            {...hold.bind(l.id)}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                setConfirmId(l.id);
              }
            }}
            onClick={() => {
              if (!hold.consumeClick()) onOpen(l.id);
            }}
            aria-label={`${formatDate(l.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${progressLabel(entries)}. Press and hold, or press Delete, to delete.`}
          >
            <span class="datebadge">
              <span class="dow">{formatDate(l.date, { weekday: 'short' })}</span>
              <span class="dnum">{formatDate(l.date, { day: 'numeric' })}</span>
              <span class="dmon">{formatDate(l.date, { month: 'short' })}</span>
            </span>
            <span class="lineup-body">
              <span class="t">{formatDate(l.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span class="a">
                {entries.length === 0 ? 'No songs yet' : entries.map((e) => e.song.title || 'Untitled').join(' · ')}
              </span>
              <span class={`progress${isComplete(entries) ? ' done' : ''}`}>{progressLabel(entries)}</span>
            </span>
            <span class="chev"><Icon name="next" size={20} /></span>
          </button>
        )}
      </li>
    );
  };

  return (
    <main class="library lineups">
      <div class="lib-top">
        <div class="brand">
          <button class="btn icon ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
          Line up
        </div>
        <ThemeToggle />
      </div>

      <button class="btn primary create-btn" onClick={onCreate}>
        <Icon name="plus" size={22} />
        Create new line up
      </button>

      {lineups.length === 0 && (
        <div class="empty">
          <div class="art"><Icon name="calendar" size={34} /></div>
          <h2>No line ups yet</h2>
          <p>Plan a service: pick the date, then the opening, welcome, praise and worship songs.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section class="letter-group">
          <h2 class="letter-head"><span class="letter small">Upcoming</span><span class="letter-count">{upcoming.length}</span></h2>
          <ul class="lib-list">{upcoming.map(card)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section class="letter-group">
          <h2 class="letter-head"><span class="letter small">Past</span><span class="letter-count">{past.length}</span></h2>
          <ul class="lib-list">{past.map(card)}</ul>
        </section>
      )}
    </main>
  );
}
