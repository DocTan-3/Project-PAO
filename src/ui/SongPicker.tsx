import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LANGUAGES, countByLanguage, groupSongs, languageOf } from '../model/library';
import type { Language, Song } from '../model/types';
import { Icon } from './icons';

/** Full-screen chooser for one slot of a line up: search, English/Tagalog, A-Z. */
export function SongPicker({
  title,
  songs,
  usedIds,
  initialLanguage,
  onPick,
  onClose,
}: {
  title: string;
  songs: Song[];
  /** songs already in this line up (shown with a tag, still choosable) */
  usedIds: Set<string>;
  initialLanguage: Language;
  onPick: (song: Song) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Language>(initialLanguage);
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => (q ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : songs), [songs, q]);
  const counts = countByLanguage(filtered);
  const groups = useMemo(() => groupSongs(filtered, lang), [filtered, lang]);
  const other = LANGUAGES.find((l) => l.id !== lang)!;

  return (
    <div class="picker" role="dialog" aria-modal="true" aria-label={title}>
      <header class="picker-bar">
        <button class="btn icon ghost" onClick={onClose} aria-label="Close without choosing"><Icon name="close" /></button>
        <h1>{title}</h1>
      </header>
      <div class="picker-body">
        <label class="search">
          <Icon name="search" size={20} />
          <input
            ref={search}
            id="picker-search"
            type="search"
            placeholder="Search songs or artists"
            value={query}
            autocomplete="off"
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            aria-label="Search songs"
          />
        </label>
        <div class="lang-tabs" role="tablist" aria-label="Song language">
          {LANGUAGES.map((l) => (
            <button key={l.id} role="tab" aria-selected={lang === l.id} class={`lang-tab${lang === l.id ? ' on' : ''}`} onClick={() => setLang(l.id)}>
              {l.label}
              <span class="lang-count">{counts[l.id]}</span>
            </button>
          ))}
        </div>

        {groups.length === 0 && (
          <div class="empty">
            <h2>{q ? 'No songs match' : `No ${lang === 'tl' ? 'Tagalog' : 'English'} songs yet`}</h2>
            {q && counts[other.id] > 0 && (
              <button class="btn" onClick={() => setLang(other.id)}>Show {counts[other.id]} in {other.label}</button>
            )}
          </div>
        )}

        {groups.map((g) => (
          <section class="letter-group" key={g.letter}>
            <h2 class="letter-head"><span class="letter">{g.letter}</span><span class="letter-count">{g.songs.length}</span></h2>
            <ul class="lib-list">
              {g.songs.map((s) => (
                <li key={s.id} class="lib-item">
                  <button class="song-card" onClick={() => onPick(s)} aria-label={`Choose ${s.title || 'Untitled'}`}>
                    <span class={`keybadge${s.key ? '' : ' none'}`}>{s.key ?? '–'}</span>
                    <span>
                      <span class="t">{s.title || 'Untitled'}</span>
                      <span class="a">{s.artist || 'No artist'}{languageOf(s) !== lang ? '' : ''}</span>
                    </span>
                    {usedIds.has(s.id) ? <span class="used-tag">In line up</span> : <span class="chev"><Icon name="plus" size={20} /></span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
