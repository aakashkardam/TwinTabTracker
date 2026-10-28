import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { selectKeepTab } from './keep';

describe('keep-tab policy', () => {
  it('prefers the active tab', () => {
    expect(
      selectKeepTab([
        tab({ id: 1, pinned: true, windowId: 1, index: 0 }),
        tab({ id: 2, active: true, windowId: 2, index: 0 }),
      ]),
    ).toBe(2);
  });

  it('prefers a pinned tab when none are active', () => {
    expect(
      selectKeepTab([
        tab({ id: 4, windowId: 1, index: 2 }),
        tab({ id: 3, pinned: true, windowId: 1, index: 5 }),
      ]),
    ).toBe(3);
  });

  it('prefers the focused window, then lowest index', () => {
    expect(
      selectKeepTab(
        [
          tab({ id: 8, windowId: 2, index: 0 }),
          tab({ id: 7, windowId: 1, index: 3 }),
        ],
        1,
      ),
    ).toBe(7);
  });
});
