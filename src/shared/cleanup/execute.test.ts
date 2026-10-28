import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { MemoryBrowser } from '../../test/memory-browser';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import { detectDuplicateGroups } from '../duplicates/detect';
import { planCleanup } from '../duplicates/plan';
import { executeCleanup } from './execute';
import { undoCleanup } from './undo';

describe('cleanup execution and undo', () => {
  it('closes only revalidated selected tabs and supports undo', async () => {
    const browser = new MemoryBrowser();
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', active: true, windowId: 1, index: 0 }),
      tab({ id: 2, url: 'https://example.com/a', windowId: 1, index: 1 }),
      tab({ id: 3, url: 'https://example.com/a', windowId: 1, index: 2 }),
    ];
    browser.tabs = tabs.map((item) => ({
      id: item.id,
      windowId: item.windowId,
      index: item.index,
      url: item.url ?? undefined,
      title: item.title ?? undefined,
      active: item.active,
      pinned: item.pinned,
    }));
    const groups = detectDuplicateGroups(tabs, DEFAULT_SETTINGS);
    const plan = planCleanup(groups, [1, 2, 3], DEFAULT_SETTINGS, tabs);
    const result = await executeCleanup(browser, {
      targets: plan.targets,
      keepTabIds: plan.keepTabIds,
      settings: DEFAULT_SETTINGS,
      allTabs: tabs,
    });
    expect(result.closed.map((item) => item.tabId).sort()).toEqual([2, 3]);
    expect(browser.tabs.map((item) => item.id)).toEqual([1]);
    const undo = await undoCleanup(browser, result);
    expect(undo.restored).toBe(2);
  });

  it('skips tabs that navigated after the preview', async () => {
    const browser = new MemoryBrowser();
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', active: true, windowId: 1, index: 0 }),
      tab({ id: 2, url: 'https://example.com/a', windowId: 1, index: 1 }),
    ];
    browser.tabs = [
      { id: 1, windowId: 1, index: 0, url: 'https://example.com/a', active: true },
      { id: 2, windowId: 1, index: 1, url: 'https://example.com/changed', active: false },
    ];
    const groups = detectDuplicateGroups(tabs, DEFAULT_SETTINGS);
    const plan = planCleanup(groups, [2], DEFAULT_SETTINGS, tabs);
    const result = await executeCleanup(browser, {
      targets: plan.targets,
      keepTabIds: plan.keepTabIds,
      settings: DEFAULT_SETTINGS,
      allTabs: tabs,
    });
    expect(result.closed).toHaveLength(0);
    expect(result.skipped.some((item) => item.reason === 'navigated')).toBe(true);
  });

  it('reports failures instead of pretending success', async () => {
    const browser = new MemoryBrowser();
    browser.failRemove = true;
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', active: true, windowId: 1, index: 0 }),
      tab({ id: 2, url: 'https://example.com/a', windowId: 1, index: 1 }),
    ];
    browser.tabs = tabs.map((item) => ({
      id: item.id,
      windowId: item.windowId,
      index: item.index,
      url: item.url ?? undefined,
      active: item.active,
    }));
    const groups = detectDuplicateGroups(tabs, DEFAULT_SETTINGS);
    const plan = planCleanup(groups, [2], DEFAULT_SETTINGS, tabs);
    const result = await executeCleanup(browser, {
      targets: plan.targets,
      keepTabIds: plan.keepTabIds,
      settings: DEFAULT_SETTINGS,
      allTabs: tabs,
    });
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.closed).toHaveLength(0);
  });
});
