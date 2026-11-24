import { describe, expect, it } from 'vitest';
import { backAction } from './native';

describe('Android back button', () => {
  it('closes an open panel before anything else, wherever you are', () => {
    for (const h of ['', '#lineups', '#chords', '#settings', '#share', '#song-1', '#edit-1', '#set-x-2']) expect(backAction(h, true, 5)).toBe('close-overlay');
  });
  it('leaves the app only from the songs home screen', () => {
    expect(backAction('', false, 1)).toBe('exit');
    expect(backAction('#', false, 3)).toBe('exit');
  });
  it('the line up list goes back to songs, not out of the app', () => {
    expect(backAction('#lineups', false, 2)).toBe('to-songs');
    expect(backAction('#chords', false, 3)).toBe('to-songs');
    expect(backAction('#settings', false, 3)).toBe('to-songs');
  });
  it('steps back through screens that were opened one after another', () => {
    for (const h of ['#song-1', '#edit-1', '#lineup-1', '#set-1-0']) expect(backAction(h, false, 2)).toBe('history-back');
  });
  it('with nothing to go back to, a deep screen returns to songs instead of exiting', () => {
    expect(backAction('#song-1', false, 1)).toBe('to-songs');
  });
});
