import { describe, expect, it } from 'vitest';
import { setBrowserAdapterForTests } from '../shared/browser/runtime';
import { MemoryBrowser } from '../test/memory-browser';
import { tab } from '../test/fixtures';
import { parkAndClose, restoreParkedEntries } from './actions';

describe('park and restore actions', () => {
  it('parks a tab, closes it when safe, and can reopen the URL', async () => {
    const browser = new MemoryBrowser();
    browser.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'Keep', url: 'https://example.com/keep', active: true },
      { id: 2, windowId: 1, index: 1, title: 'Park me', url: 'https://example.com/park', active: false },
    ];
    setBrowserAdapterForTests(browser);

    const result = await parkAndClose([tab({ id: 2, windowId: 1, url: 'https://example.com/park', title: 'Park me' })]);
    expect(result.parked).toBe(1);
    expect(result.closed).toBe(1);
    expect(browser.tabs.map((item) => item.id)).toEqual([1]);

    await restoreParkedEntries(
      [
        {
          id: 'park-1',
          url: 'https://example.com/park',
          title: 'Park me',
          favIconUrl: null,
          collectionId: 'inbox',
          parkedAt: 1,
          sourceWindowId: 1,
          notes: '',
        },
      ],
      false,
    );
    expect(browser.tabs.some((item) => item.url === 'https://example.com/park')).toBe(true);
    setBrowserAdapterForTests(null);
  });

  it('keeps the last tab in a window open after parking', async () => {
    const browser = new MemoryBrowser();
    browser.tabs = [{ id: 1, windowId: 1, index: 0, title: 'Only', url: 'https://example.com/only', active: true }];
    setBrowserAdapterForTests(browser);
    const result = await parkAndClose([tab({ id: 1, windowId: 1, url: 'https://example.com/only', title: 'Only', active: true })]);
    expect(result.parked).toBe(1);
    expect(result.closed).toBe(0);
    expect(browser.tabs).toHaveLength(1);
    setBrowserAdapterForTests(null);
  });
});
