import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { detectDuplicateGroups } from '../duplicates/detect';
import { searchTabs } from '../search/filter';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import type { InventoryTab } from '../types';

function syntheticTabs(count: number): InventoryTab[] {
  const tabs: InventoryTab[] = [];
  for (let i = 0; i < count; i += 1) {
    const duplicate = i % 7 === 0;
    const url = duplicate
      ? `https://dup.example.com/item/${i % 40}`
      : `https://site${i % 50}.example.com/page/${i}`;
    tabs.push(
      tab({
        id: i + 1,
        windowId: (i % 4) + 1,
        index: i,
        title: `Tab ${i} ${duplicate ? 'copy' : 'unique'}`,
        url,
      }),
    );
  }
  return tabs;
}

describe('synthetic inventory performance', () => {
  it('detects duplicates and filters 300 tabs quickly', () => {
    const tabs = syntheticTabs(300);
    const started = performance.now();
    const groups = detectDuplicateGroups(tabs, DEFAULT_SETTINGS);
    const results = searchTabs(tabs, 'copy');
    const elapsed = performance.now() - started;
    expect(groups.length).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
    console.log(`300-tab detect+search: ${elapsed.toFixed(2)}ms, groups=${groups.length}`);
  });

  it('detects duplicates and filters 1000 tabs quickly', () => {
    const tabs = syntheticTabs(1000);
    const started = performance.now();
    const groups = detectDuplicateGroups(tabs, { ...DEFAULT_SETTINGS, matchMode: 'smart' });
    const results = searchTabs(tabs, 'example.com/page');
    const elapsed = performance.now() - started;
    expect(groups.length).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(250);
    console.log(`1000-tab smart detect+search: ${elapsed.toFixed(2)}ms, groups=${groups.length}`);
  });
});
