import { useMemo, useRef, useState } from 'preact/hooks';
import { LANGUAGES, countByLanguage, groupSongs } from '../model/library';
import type { Language, Song } from '../model/types';
import { Icon } from './icons';
import { ThemeToggle } from './theme';

const HOLD_MS = 550;

function loadLang(): Language {
  try {
    return localStorage.getItem('pao:lang') === 'tl' ? 'tl' : 'en';
  } catch {
    return 'en';
  }
}

export function Library({
  songs,
  onOpen,
  onNew,
  onDelete,
}: {
  songs: Song[];
  onOpen: (id: string) => void;
  onNew: (language: Language) => void;
  onDelete: (id: string) => void;
}) {
  const [lang, setLangState] = useState<Language>(loadLang);
  const [query, setQuery] = useState('');
  // Deleting takes two taps (hosted pages cannot show confirm dialogs).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // press and hold a song to delete it
  const [pressing, setPressing] = useState<string | null>(null);
  const holdTimer = useRef(0);
  const held = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const cancelHold = () => {
    clearTimeout(holdTimer.current);
    setPressing(null);
  };
  const beginHold = (e: PointerEvent, id: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    held.current = false;
    origin.current = { x: e.clientX, y: e.clientY };
    setPressing(id);
    clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setPressing(null);
      try {
        navigator.vibrate?.(30);
      } catch {
        /* not supported */
      }
      setConfirmId(id);
    }, HOLD_MS);
  };
  const moveHold = (e: PointerEvent) => {
    // scrolling or dragging is not a press
    if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 10) cancelHold();
  };

  const setLang = (l: Language) => {
    setLangState(l);
    setConfirmId(null);
    try {
      localStorage.setItem('pao:lang', l);
    } catch {
      /* ignore */
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : songs),
    [songs, q],
  );
  const counts = countByLanguage(filtered);
  const totals = countByLanguage(songs);
  const groups = useMemo(() => groupSongs(filtered, lang), [filtered, lang]);
  const langLabel = LANGUAGES.find((l) => l.id === lang)!.label;
  const other = LANGUAGES.find((l) => l.id !== lang)!;
  const showRail = groups.length >= 2;

  const jump = (letter: string) =>
    document.getElementById(`letter-${lang}-${letter}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  return (
    <main class={`library${showRail ? ' has-rail' : ''}`}>
      <div class="lib-top">
        <div class="brand">
          <span class="brand-mark"><Icon name="note" size={22} /></span>
          Songbook
        </div>
        <ThemeToggle />
      </div>

      {songs.length > 0 && (
        <label class="search">
          <Icon name="search" size={20} />
          <input
            id="song-search"
            type="search"
            placeholder="Search songs or artists"
            value={query}
            autocomplete="off"
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            aria-label="Search songs"
          />
        </label>
      )}

      <div class="lang-tabs" role="tablist" aria-label="Song language">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            role="tab"
            id={`tab-${l.id}`}
            aria-selected={lang === l.id}
            class={`lang-tab${lang === l.id ? ' on' : ''}`}
            onClick={() => setLang(l.id)}
          >
            {l.label}
            <span class="lang-count">{counts[l.id]}</span>
          </button>
        ))}
      </div>

      {groups.length > 0 && (
        <p class="lib-count">
          {q
            ? `${counts[lang]} of ${totals[lang]} ${langLabel} songs`
            : `${counts[lang]} ${langLabel} ${counts[lang] === 1 ? 'song' : 'songs'}`}
          <span class="lib-hint"> · hold a song to delete</span>
        </p>
      )}

      {groups.length === 0 && (
        <div class="empty" role="tabpanel">
          {q ? (
            <>
              <h2>No {langLabel} songs match “{query}”</h2>
              {counts[other.id] > 0 ? (
                <button class="btn" onClick={() => setLang(other.id)}>
                  Show {counts[other.id]} in {other.label}
                </button>
              ) : (
                <p>Try a different title or artist.</p>
              )}
            </>
          ) : (
            <>
              <div class="art"><Icon name="note" size={34} /></div>
              <h2>No {langLabel} songs yet</h2>
              <p>Tap New song to write one. It will be added to the {langLabel} list.</p>
            </>
          )}
        </div>
      )}

      <div role="tabpanel" aria-labelledby={`tab-${lang}`}>
        {groups.map((g) => (
          <section class="letter-group" key={g.letter}>
            <h2 class="letter-head" id={`letter-${lang}-${g.letter}`}>
              <span class="letter">{g.letter}</span>
              <span class="letter-count">{g.songs.length}</span>
            </h2>
            <ul class="lib-list">
              {g.songs.map((s) => (
                <li key={s.id} class="lib-item">
                  {confirmId === s.id ? (
                    <div class="confirm" role="alertdialog" aria-label={`Delete ${s.title || 'Untitled'}?`}>
                      <span>Delete “{s.title || 'Untitled'}” for good?</span>
                      <button class="btn danger" onClick={() => { setConfirmId(null); onDelete(s.id); }}>Delete</button>
                      <button class="btn" onClick={() => setConfirmId(null)}>Keep it</button>
                    </div>
                  ) : (
                    <button
                      class={`song-card${pressing === s.id ? ' pressing' : ''}`}
                      onPointerDown={(e) => beginHold(e, s.id)}
                      onPointerMove={moveHold}
                      onPointerUp={cancelHold}
                      onPointerLeave={cancelHold}
                      onPointerCancel={cancelHold}
                      onContextMenu={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          e.preventDefault();
                          setConfirmId(s.id);
                        }
                      }}
                      onClick={() => {
                        if (held.current) {
                          held.current = false; // the press that opened the delete prompt must not also open the song
                          return;
                        }
                        onOpen(s.id);
                      }}
                      aria-label={`${s.title || 'Untitled'}${s.artist ? `, ${s.artist}` : ''}. Press and hold, or press Delete, to delete.`}
                    >
                      <span class={`keybadge${s.key ? '' : ' none'}`}>{s.key ?? '–'}</span>
                      <span>
                        <span class="t">{s.title || 'Untitled'}</span>
                        <span class="a">{s.artist || 'No artist'}</span>
                      </span>
                      <span class="chev"><Icon name="next" size={20} /></span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {showRail && (
        <nav class="letter-rail" aria-label="Jump to letter">
          {groups.map((g) => (
            <button key={g.letter} onClick={() => jump(g.letter)} aria-label={`Jump to ${g.letter}`}>
              {g.letter}
            </button>
          ))}
        </nav>
      )}

      <button class="fab" onClick={() => onNew(lang)}>
        <Icon name="plus" size={22} />
        New {langLabel} song
      </button>
    </main>
  );
}
