import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { reduceInventory } from './reduce';

describe('inventory reducer', () => {
  it('adds, updates, and removes tabs', () => {
    let state = [tab({ id: 1, url: 'https://example.com/a', title: 'A' })];
    state = reduceInventory(state, {
      type: 'created',
      tab: { id: 2, windowId: 1, index: 1, url: 'https://example.com/b', title: 'B' },
    }).tabs;
    expect(state).toHaveLength(2);
    state = reduceInventory(state, { type: 'updated', tabId: 2, change: { title: 'Bee', url: 'https://example.com/b2' } }).tabs;
    expect(state.find((item) => item.id === 2)?.title).toBe('Bee');
    state = reduceInventory(state, { type: 'removed', tabId: 1 }).tabs;
    expect(state.map((item) => item.id)).toEqual([2]);
  });

  it('requests a full refresh for unknown tab updates', () => {
    const result = reduceInventory([], { type: 'updated', tabId: 99, change: { title: 'Ghost' } });
    expect(result.needsFullRefresh).toBe(true);
  });

  it('activates a tab within a window', () => {
    const state = [
      tab({ id: 1, windowId: 1, active: true }),
      tab({ id: 2, windowId: 1, active: false }),
    ];
    const next = reduceInventory(state, { type: 'activated', tabId: 2, windowId: 1 }).tabs;
    expect(next.find((item) => item.id === 2)?.active).toBe(true);
    expect(next.find((item) => item.id === 1)?.active).toBe(false);
  });

  it('shifts sibling indices when a tab moves in the same window', () => {
    const state = [
      tab({ id: 1, windowId: 1, index: 0 }),
      tab({ id: 2, windowId: 1, index: 1 }),
      tab({ id: 3, windowId: 1, index: 2 }),
    ];
    const next = reduceInventory(state, {
      type: 'moved',
      tabId: 1,
      windowId: 1,
      fromIndex: 0,
      toIndex: 2,
    }).tabs;
    expect(next.find((item) => item.id === 1)?.index).toBe(2);
    expect(next.find((item) => item.id === 2)?.index).toBe(0);
    expect(next.find((item) => item.id === 3)?.index).toBe(1);
  });
});
