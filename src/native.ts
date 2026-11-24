import { App } from '@capacitor/app';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export type BackAction = 'close-overlay' | 'to-songs' | 'history-back' | 'exit';

/**
 * What the Android back button should do: close whatever panel is open first, step back through
 * screens, and leave the app only from the songs home screen.
 */
export function backAction(hash: string, overlayOpen: boolean, historyLength: number): BackAction {
  if (overlayOpen) return 'close-overlay';
  if (hash === '' || hash === '#') return 'exit';
  if (hash === '#lineups' || hash === '#chords' || hash === '#settings') return 'to-songs';
  return historyLength > 1 ? 'history-back' : 'to-songs';
}

const OVERLAYS = '.drawer-wrap.open, .sheet-backdrop, .picker, .ctb-wrap';

const isDark = (): boolean => document.documentElement.getAttribute('data-tone') === 'dark';

/** Match the status and navigation bar icons to the app's own theme (which can differ from the phone's). */
function syncSystemBars(): void {
  SystemBars.setStyle({ style: isDark() ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined);
}

/** Hook the app up to Android: the back button and the system bar colours. Does nothing in a browser. */
export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return;

  void App.addListener('backButton', () => {
    const action = backAction(location.hash, !!document.querySelector(OVERLAYS), history.length);
    if (action === 'close-overlay') dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    else if (action === 'history-back') history.back();
    else if (action === 'to-songs') location.replace('#');
    else void App.exitApp();
  });

  syncSystemBars();
  new MutationObserver(syncSystemBars).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tone'] });
}
