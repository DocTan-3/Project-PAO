import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LANGUAGES, countByLanguage, groupSongs } from '../model/library';
import type { Language, Song } from '../model/types';
import { Icon } from './icons';
import { ThemeToggle } from './theme';
import { useHold } from './useHold';

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
  onMenu,
}: {
  songs: Song[];
  onOpen: (id: string) => void;
  onNew: (language: Language) => void;
  onDelete: (id: string) => void;
  onMenu: () => void;
}) {
  const [lang, setLangState] = useState<Language>(loadLang);
  const [query, setQuery] = useState('');
  // Deleting takes two taps (hosted pages cannot show confirm dialogs).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // press and hold a song to delete it
  const hold = useHold((id) => setConfirmId(id));

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
  const groups = useMemo(() => groupSongs(filtered, lang), [filtered, lang]);
  const langLabel = LANGUAGES.find((l) => l.id === lang)!.label;
  const other = LANGUAGES.find((l) => l.id !== lang)!;
  const showRail = groups.length >= 2;

  // the top block (title, search, English/Tagalog) stays pinned; the letter headings stick just beneath it
  const pinRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = pinRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const set = () => root.style.setProperty('--lib-head-h', `${el.offsetHeight}px`);
    const ro = new ResizeObserver(set);
    ro.observe(el);
    set();
    return () => ro.disconnect();
  }, []);

  const jump = (letter: string) =>
    document.getElementById(`letter-${lang}-${letter}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  return (
    <main class={`library${showRail ? ' has-rail' : ''}`} ref={rootRef}>
      <div class="lib-pinned" ref={pinRef}>
      <div class="lib-top">
        <div class="brand">
          <button class="btn icon ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
          Songs
        </div>
        <ThemeToggle labelled />
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

      </div>

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
                      class={`song-card${hold.pressing === s.id ? ' pressing' : ''}`}
                      {...hold.bind(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          e.preventDefault();
                          setConfirmId(s.id);
                        }
                      }}
                      onClick={() => {
                        if (!hold.consumeClick()) onOpen(s.id); // the press that opened the delete prompt must not also open the song
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
