import { useEffect, useMemo, useState } from 'preact/hooks';
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
  // Line ups move from Upcoming to Finished by themselves when their date has passed, even if the app stays open overnight
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const untilMidnight = () => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime() + 1000;
    };
    let timer = setTimeout(function tick() {
      refresh();
      timer = setTimeout(tick, untilMidnight());
    }, untilMidnight());
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      removeEventListener('focus', refresh);
    };
  }, []);
  const { upcoming, finished } = useMemo(() => groupLineups(lineups, today), [lineups, today]);

  const card = (l: Lineup, isFinished = false) => {
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
            class={`lineup-card${hold.pressing === l.id ? ' pressing' : ''}${isFinished ? ' finished' : ''}`}
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

      {lineups.length > 0 && (
        <>
          <section class="letter-group" id="lineups-upcoming" aria-label="Upcoming line ups">
            <h2 class="letter-head"><span class="letter small">Upcoming</span><span class="letter-count">{upcoming.length}</span></h2>
            {upcoming.length > 0 ? (
              <ul class="lib-list">{upcoming.map((l) => card(l))}</ul>
            ) : (
              <p class="section-empty">Nothing planned. Tap Create new line up to plan the next service.</p>
            )}
          </section>
          <section class="letter-group" id="lineups-finished" aria-label="Finished line ups">
            <h2 class="letter-head"><span class="letter small">Finished</span><span class="letter-count">{finished.length}</span></h2>
            {finished.length > 0 ? (
              <ul class="lib-list">{finished.map((l) => card(l, true))}</ul>
            ) : (
              <p class="section-empty">A line up moves here by itself once its date has passed.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
