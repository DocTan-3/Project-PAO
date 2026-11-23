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

async function hold(): Promise<void> {
  try {
    if ((await KeepAwake.isSupported()).isSupported) await KeepAwake.keepAwake();
  } catch {
    /* not available (older browser, or the page is hidden): the screen just behaves normally */
  }
}
async function release(): Promise<void> {
  try {
    await KeepAwake.allowSleep();
  } catch {
    /* nothing was held */
  }
}

/**
 * Stop the screen from dimming or locking while `active` is true, and let go as soon as it is not
 * (leaving the screen, switching the setting off, or closing the app). On Android this is the native
 * "keep screen on" flag; in a browser it is the Screen Wake Lock, which is re-taken when the tab returns.
 */
export function useScreenAwake(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    void hold();
    return () => void release();
  }, [active]);
}
