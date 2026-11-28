import { describe, expect, it } from 'vitest';
import { assignSlot, copyPeople, peopleKey, teamLabel, copySource, hasPeople, isCopied, newLineup, peopleOf, setPerson } from './lineup';
import { cleanLineup } from './lineupShare';

const withSongs = () => {
  let l = newLineup('2026-12-06');
  for (const [k, id] of [['opening', 'a'], ['welcome', 'b'], ['praise1', 'c']] as const) l = assignSlot(l, k, id);
  return l;
};

describe('song leader, musicians and backup singers', () => {
  it('stores a name for one song only', () => {
    const l = setPerson(withSongs(), 'opening', 'leader', 'Anna');
    expect(peopleOf(l, 'opening').leader).toBe('Anna');
    expect(peopleOf(l, 'welcome').leader).toBe('');
    expect(hasPeople(l, 'opening')).toBe(true);
    expect(hasPeople(l, 'welcome')).toBe(false);
  });
  it('offers nothing for the first song or when no earlier song has names', () => {
    const l = withSongs();
    expect(copySource(l, 'opening', 'musicians')).toBeNull();
    expect(copySource(l, 'welcome', 'musicians')).toBeNull();
  });
  it('copies the four musicians from the opening song, not the leader or the backups', () => {
    let l = withSongs();
    l = setPerson(setPerson(setPerson(l, 'opening', 'keys', 'Paolo'), 'opening', 'drums', 'Caleb'), 'opening', 'leader', 'Anna');
    l = setPerson(l, 'welcome', 'leader', 'Mark');
    expect(copySource(l, 'welcome', 'musicians')).toBe('opening');
    const c = copyPeople(l, 'welcome', 'musicians');
    expect(peopleOf(c, 'welcome')).toMatchObject({ leader: 'Mark', keys: 'Paolo', drums: 'Caleb', backup: '' });
    expect(isCopied(c, 'welcome', 'musicians')).toBe(true);
  });
  it('keeps copied names editable, and the copied state ends when they differ', () => {
    let l = setPerson(withSongs(), 'opening', 'keys', 'Paolo');
    l = copyPeople(l, 'welcome', 'musicians');
    l = setPerson(l, 'welcome', 'keys', 'Ruth');
    expect(isCopied(l, 'welcome', 'musicians')).toBe(false);
  });
  it('copies backup singers on their own and uses the nearest earlier song that has them', () => {
    let l = withSongs();
    l = setPerson(l, 'opening', 'backup', 'Liza, Ruth');
    expect(copySource(l, 'praise1', 'backup')).toBe('opening');
    l = setPerson(l, 'welcome', 'backup', 'Joy');
    expect(copySource(l, 'praise1', 'backup')).toBe('welcome');
    const c = copyPeople(l, 'praise1', 'backup');
    expect(peopleOf(c, 'praise1')).toMatchObject({ backup: 'Joy', keys: '' });
  });
  it('Praise 1 and 2 share one team, and so do Worship 1 and 2', () => {
    let l = withSongs();
    l = assignSlot(assignSlot(l, 'praise2', 'd'), 'worship2', 'e');
    l = setPerson(l, 'praise2', 'leader', 'Ben');
    expect(peopleOf(l, 'praise1').leader).toBe('Ben');
    expect(peopleOf(l, 'praise2').leader).toBe('Ben');
    l = setPerson(l, 'worship1', 'drums', 'Caleb');
    expect(peopleOf(l, 'worship2').drums).toBe('Caleb');
    expect(peopleKey('praise2')).toBe('praise1');
    expect(teamLabel('praise2')).toBe('Praise');
    expect(teamLabel('opening')).toBe('Opening Song');
  });
  it('Worship copies from Praise as one team', () => {
    let l = withSongs();
    l = assignSlot(assignSlot(l, 'praise2', 'd'), 'worship1', 'e');
    l = setPerson(l, 'praise1', 'keys', 'Paolo');
    expect(copySource(l, 'worship1', 'musicians')).toBe('praise1');
    expect(copySource(l, 'worship2', 'musicians')).toBe('praise1');
    expect(peopleOf(copyPeople(l, 'worship2', 'musicians'), 'worship1').keys).toBe('Paolo');
  });
  it('skips songs that are not chosen yet', () => {
    let l = newLineup('2026-12-06');
    l = assignSlot(assignSlot(l, 'opening', 'a'), 'praise1', 'c');
    l = setPerson(l, 'opening', 'keys', 'Paolo');
    expect(copySource(l, 'praise1', 'musicians')).toBe('opening');
  });
  it('survives being published and read back, with text cleaned', () => {
    const l = setPerson(setPerson(withSongs(), 'opening', 'leader', '  Anna  '), 'opening', 'keys', 'Paolo');
    const back = cleanLineup(JSON.parse(JSON.stringify(l)));
    expect(back?.people?.opening).toEqual({ leader: 'Anna', keys: 'Paolo' });
    expect(cleanLineup({ ...JSON.parse(JSON.stringify(l)), people: { opening: { leader: 5, keys: 'x'.repeat(500) } } })?.people?.opening?.keys?.length).toBe(80);
  });
});
