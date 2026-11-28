import { useEffect, useRef } from 'preact/hooks';
import { Icon, type IconName } from './icons';
import { Logo } from './logo';

export type Section = 'songs' | 'lineups' | 'favorites' | 'chords' | 'settings';

const ITEMS: { id: Section; label: string; icon: IconName }[] = [
  { id: 'songs', label: 'Songs', icon: 'note' },
  { id: 'lineups', label: 'Line Ups', icon: 'list' },
  { id: 'favorites', label: 'Favorites', icon: 'heart' },
  { id: 'chords', label: 'Chords', icon: 'chord' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

/** Side menu opened by the hamburger button: the two sections of the app. */
export function Drawer({
  open,
  active,
  counts,
  keepAwake,
  onKeepAwake,
  onPick,
  onClose,
}: {
  open: boolean;
  active: Section;
  counts: Partial<Record<Section, number>>;
  keepAwake: boolean;
  onKeepAwake: (on: boolean) => void;
  onPick: (s: Section) => void;
  onClose: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [open, onClose]);

  return (
    <div class={`drawer-wrap${open ? ' open' : ''}`} aria-hidden={!open}>
      <div class="drawer-backdrop" onClick={onClose} />
      <nav class="drawer" aria-label="Main menu">
        <div class="drawer-head">
          <div class="brand">
            <span class="brand-mark logo"><Logo size={38} /></span>
            BPCG - PAW
          </div>
          <button class="btn icon ghost" onClick={onClose} aria-label="Close menu" tabIndex={open ? 0 : -1}>
            <Icon name="close" />
          </button>
        </div>
        <ul>
          {ITEMS.map((it, i) => (
            <li key={it.id}>
              <button
                ref={i === 0 ? first : undefined}
                class={`drawer-item${active === it.id ? ' on' : ''}`}
                aria-current={active === it.id ? 'page' : undefined}
                tabIndex={open ? 0 : -1}
                onClick={() => onPick(it.id)}
              >
                <Icon name={it.icon} size={22} />
                <span class="drawer-label">{it.label}</span>
                {counts[it.id] !== undefined && <span class="drawer-count">{counts[it.id]}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div class="drawer-setting">
          <span class="drawer-setting-text">
            <span class="drawer-setting-title">Keep screen on</span>
            <span class="drawer-setting-sub">Stops the screen dimming while you read a song</span>
          </span>
          <button
            class={`switch${keepAwake ? ' on' : ''}`}
            role="switch"
            aria-checked={keepAwake}
            aria-label="Keep screen on while reading"
            tabIndex={open ? 0 : -1}
            onClick={() => onKeepAwake(!keepAwake)}
          >
            <span class="knob" />
          </button>
        </div>
      </nav>
    </div>
  );
}
