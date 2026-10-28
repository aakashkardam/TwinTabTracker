import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import { detectDuplicateGroups } from './detect';
import { planCleanup } from './plan';

describe('cleanup target selection', () => {
  const settings = { ...DEFAULT_SETTINGS };

  it('never includes the keep tab', () => {
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', active: true }),
      tab({ id: 2, url: 'https://example.com/a' }),
      tab({ id: 3, url: 'https://example.com/a' }),
    ];
    const groups = detectDuplicateGroups(tabs, settings);
    const plan = planCleanup(groups, [1, 2, 3], settings, tabs);
    expect(plan.targets.map((item) => item.tabId)).toEqual([2, 3]);
    expect(plan.keepTabIds).toContain(1);
  });

  it('protects pinned and active tabs by default', () => {
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', pinned: true, windowId: 1, index: 0 }),
      tab({ id: 2, url: 'https://example.com/a', active: true, windowId: 1, index: 1 }),
      tab({ id: 3, url: 'https://example.com/a', windowId: 1, index: 2 }),
    ];
    const groups = detectDuplicateGroups(tabs, settings);
    const plan = planCleanup(groups, [1, 2, 3], settings, tabs);
    expect(plan.targets.map((item) => item.tabId)).toEqual([3]);
  });

  it('avoids closing the last tab in a window', () => {
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', windowId: 1, index: 0, active: true }),
      tab({ id: 2, url: 'https://example.com/a', windowId: 2, index: 0 }),
    ];
    const groups = detectDuplicateGroups(tabs, settings);
    const plan = planCleanup(groups, [1, 2], settings, tabs);
    expect(plan.targets).toHaveLength(0);
    expect(plan.skipped.some((item) => item.reason === 'protected-last-in-window')).toBe(true);
  });

  it('honors the current selection', () => {
    const tabs = [
      tab({ id: 1, url: 'https://example.com/a', active: true, windowId: 1, index: 0 }),
      tab({ id: 2, url: 'https://example.com/a', windowId: 1, index: 1 }),
      tab({ id: 3, url: 'https://example.com/a', windowId: 1, index: 2 }),
    ];
    const groups = detectDuplicateGroups(tabs, settings);
    const plan = planCleanup(groups, [2], settings, tabs);
    expect(plan.targets.map((item) => item.tabId)).toEqual([2]);
  });
});
