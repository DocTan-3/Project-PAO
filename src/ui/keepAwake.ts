import { KeepAwake } from '@capacitor-community/keep-awake';
import { useEffect, useState } from 'preact/hooks';

const KEY = 'pao:keepawake';
const CHANGED = 'pao:keepawake-changed';

/** "Keep the screen on while reading" is on unless the user switched it off. */
export function loadKeepAwake(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveKeepAwake(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
  dispatchEvent(new CustomEvent(CHANGED, { detail: on }));
}

/** The setting, shared by every place that shows it (reader button, menu switch). */
export function useKeepAwakeSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(loadKeepAwake);
  useEffect(() => {
    const sync = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    addEventListener(CHANGED, sync);
    return () => removeEventListener(CHANGED, sync);
  }, []);
  return [on, saveKeepAwake];
}

// Several screens can ask for the lock at once (moving to the next song mounts the new reader before, or
// after, the old one lets go). So we count the askers and apply changes strictly one at a time: the result
// always matches the latest request, and the screen is never left unlocked by two async calls crossing.
let wanted = 0;
let held = false;
let queue: Promise<void> = Promise.resolve();

function apply(): void {
  queue = queue.then(async () => {
    try {
      if (wanted > 0 && !held) {
        if ((await KeepAwake.isSupported()).isSupported) {
          await KeepAwake.keepAwake();
          held = true;
        }
      } else if (wanted === 0 && held) {
        held = false;
        await KeepAwake.allowSleep();
      }
    } catch {
      /* not available (older browser, or the page is hidden): the screen just behaves normally */
    }
  });
}

/** Ask for the screen to stay on. Returns the function that withdraws the request. */
export function retainAwake(): () => void {
  wanted++;
  apply();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    wanted--;
    apply();
  };
}

/**
 * Stop the screen from dimming or locking while `active` is true, and let go as soon as it is not
 * (leaving the screen, switching the setting off, or closing the app). On Android this is the native
 * "keep screen on" flag; in a browser it is the Screen Wake Lock, which is re-taken when the tab returns.
 */
export function useScreenAwake(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return retainAwake();
  }, [active]);
}
