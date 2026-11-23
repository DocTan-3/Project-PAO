import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('@capacitor-community/keep-awake', () => ({
  KeepAwake: {
    isSupported: async () => ({ isSupported: true }),
    keepAwake: async () => {
      await Promise.resolve();
      calls.push('on');
    },
    allowSleep: async () => {
      await Promise.resolve();
      calls.push('off');
    },
  },
}));

/** whether the screen ends up locked: the last thing that happened was taking the lock */
const locked = () => calls[calls.length - 1] === 'on';
const settle = () => new Promise((r) => setTimeout(r, 20));
let retainAwake: typeof import('./keepAwake').retainAwake;
beforeEach(async () => {
  calls.length = 0;
  vi.resetModules();
  ({ retainAwake } = await import('./keepAwake'));
});

describe('keep the screen on', () => {
  it('takes the lock once, and lets go when the last asker withdraws', async () => {
    const a = retainAwake();
    const b = retainAwake();
    await settle();
    expect(calls).toEqual(['on']); // two askers, one lock
    a();
    await settle();
    expect(calls).toEqual(['on']); // still wanted by b
    b();
    await settle();
    expect(calls).toEqual(['on', 'off']);
  });

  it('moving to the next song: the new screen asks BEFORE the old one lets go (the screen stays locked)', async () => {
    const oldScreen = retainAwake();
    await settle();
    const newScreen = retainAwake(); // new reader mounts first...
    oldScreen(); // ...then the old one is torn down
    await settle();
    expect(calls).toEqual(['on']); // never released, never taken twice
    newScreen();
    await settle();
    expect(calls).toEqual(['on', 'off']);
  });

  it('moving to the next song: the old screen lets go BEFORE the new one asks (and the lock is retaken)', async () => {
    const oldScreen = retainAwake();
    await settle();
    oldScreen(); // old reader torn down first...
    const newScreen = retainAwake(); // ...then the new one mounts, before the release has even finished
    await settle();
    // whatever happened in between, the screen must end up locked
    expect(locked()).toBe(true);
    newScreen();
    await settle();
    expect(calls[calls.length - 1]).toBe('off');
  });

  it('withdrawing twice is harmless', async () => {
    const a = retainAwake();
    const b = retainAwake();
    await settle();
    a();
    a(); // a second call must not steal b's request
    await settle();
    expect(calls).toEqual(['on']);
    b();
    await settle();
    expect(calls).toEqual(['on', 'off']);
  });

  it('many quick on/off flips end in the right state', async () => {
    for (let i = 0; i < 20; i++) retainAwake()();
    const keep = retainAwake();
    await settle();
    expect(locked()).toBe(true);
    keep();
    await settle();
    expect(locked()).toBe(false);
  });
});
