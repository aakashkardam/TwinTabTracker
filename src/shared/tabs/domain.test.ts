import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { groupTabsByDomain } from './domain';
import { filterTabs, sortTabs } from './sort';

describe('grouping and sorting', () => {
  const tabs = [
    tab({ id: 2, title: 'Beta', url: 'https://b.example.com', windowId: 1, index: 1 }),
    tab({ id: 1, title: 'Alpha', url: 'https://a.example.com', windowId: 1, index: 0, pinned: true }),
    tab({ id: 3, title: 'Alpha 2', url: 'https://a.example.com/x', windowId: 2, index: 0 }),
  ];

  it('groups tabs by domain', () => {
    const groups = groupTabsByDomain(tabs);
    expect(groups[0]?.tabs).toHaveLength(2);
    expect(groups.map((group) => group.domain).sort()).toEqual(['a.example.com', 'b.example.com']);
  });

  it('sorts by title and filters pinned tabs', () => {
    expect(sortTabs(tabs, 'title')[0]?.title).toBe('Alpha');
    expect(filterTabs(tabs, 'pinned', new Set()).map((item) => item.id)).toEqual([1]);
  });

  it('filters possibly unused tabs', () => {
    const stale = [
      tab({ id: 8, discarded: true, active: false }),
      tab({ id: 9, discarded: false, active: true }),
    ];
    expect(filterTabs(stale, 'stale', new Set()).map((item) => item.id)).toEqual([8]);
  });
});
