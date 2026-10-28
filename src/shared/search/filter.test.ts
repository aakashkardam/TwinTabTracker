import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { searchTabs } from './filter';

describe('tab search', () => {
  const tabs = [
    tab({ id: 1, title: 'React docs', url: 'https://react.dev/learn' }),
    tab({ id: 2, title: 'Invoice', url: 'https://billing.example.com/invoices/9' }),
    tab({ id: 3, title: undefined, url: 'https://notes.example.com/secret' }),
  ];

  it('matches title, hostname, and URL case-insensitively', () => {
    expect(searchTabs(tabs, 'REACT')[0]?.tab.id).toBe(1);
    expect(searchTabs(tabs, 'billing.example.com')[0]?.tab.id).toBe(2);
    expect(searchTabs(tabs, 'invoices/9')[0]?.tab.id).toBe(2);
  });

  it('handles missing titles', () => {
    expect(searchTabs(tabs, 'notes.example.com')).toHaveLength(1);
  });

  it('returns an empty list when nothing matches', () => {
    expect(searchTabs(tabs, 'zzzz')).toEqual([]);
  });
});
