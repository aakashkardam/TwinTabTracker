import type { InventoryTab, TabFilterKey, TabSortKey } from '../types';
import { hostnameFromUrl } from '../url/hostname';

export function sortTabs(tabs: InventoryTab[], key: TabSortKey): InventoryTab[] {
  const copy = [...tabs];
  copy.sort((a, b) => {
    switch (key) {
      case 'title':
        return (a.title ?? '').localeCompare(b.title ?? '') || a.id - b.id;
      case 'domain':
        return hostnameFromUrl(a.url).localeCompare(hostnameFromUrl(b.url)) || a.id - b.id;
      case 'url':
        return (a.url ?? '').localeCompare(b.url ?? '') || a.id - b.id;
      case 'window':
      default:
        return a.windowId - b.windowId || a.index - b.index;
    }
  });
  return copy;
}

export function filterTabs(
  tabs: InventoryTab[],
  filter: TabFilterKey,
  duplicateIds: Set<number>,
): InventoryTab[] {
  switch (filter) {
    case 'pinned':
      return tabs.filter((tab) => tab.pinned);
    case 'active':
      return tabs.filter((tab) => tab.active);
    case 'duplicated':
      return tabs.filter((tab) => duplicateIds.has(tab.id));
    case 'restricted':
      return tabs.filter((tab) => tab.restricted || !tab.url);
    default:
      return tabs;
  }
}
