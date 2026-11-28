import { describe, expect, it } from 'vitest';
import { toggled } from './favorites';

describe('favorites', () => {
  it('adds a song, then removes it again', () => {
    expect(toggled([], 'a')).toEqual(['a']);
    expect(toggled(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('keeps the other favorites in order', () => {
    expect(toggled(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });
});
