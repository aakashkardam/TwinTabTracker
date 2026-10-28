import { mapBrowserTab } from '../shared/tabs/map';
import type { InventoryTab } from '../shared/types';
import type { RawBrowserTab } from '../shared/browser/types';
import { DEFAULT_SETTINGS } from '../shared/settings/defaults';

let nextId = 1;

export function resetIds(): void {
  nextId = 1;
}

export function rawTab(overrides: Partial<RawBrowserTab> = {}): RawBrowserTab {
  const id = overrides.id ?? nextId++;
  return {
    id,
    windowId: 1,
    index: id - 1,
    active: false,
    pinned: false,
    highlighted: false,
    incognito: false,
    discarded: false,
    status: 'complete',
    title: `Tab ${id}`,
    url: `https://example.com/page/${id}`,
    favIconUrl: 'https://example.com/favicon.ico',
    ...overrides,
  };
}

export function tab(overrides: Partial<RawBrowserTab> = {}): InventoryTab {
  return mapBrowserTab(rawTab(overrides));
}

export const settings = { ...DEFAULT_SETTINGS };
