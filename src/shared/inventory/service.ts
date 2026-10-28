import { getBrowserAdapter } from '../browser/adapter';
import type { BrowserAdapter, Unsub } from '../browser/types';
import { log } from '../log';
import { mapBrowserTab, mapBrowserWindow } from '../tabs/map';
import { reduceInventory, type InventoryEvent } from '../tabs/reduce';
import { isRestrictedUrl } from '../url/restricted';
import type { InventorySnapshot, InventoryTab } from '../types';

export async function loadInventory(adapter: BrowserAdapter = getBrowserAdapter()): Promise<InventorySnapshot> {
  const [rawTabs, rawWindows] = await Promise.all([adapter.queryTabs(), adapter.getWindows()]);
  const now = Date.now();
  const tabs = rawTabs
    .filter((tab) => typeof tab.id === 'number')
    .map((tab) => mapBrowserTab(tab, now))
    .filter((tab) => tab.id >= 0);
  const windows = rawWindows.map((window) => mapBrowserWindow(window, tabs));
  return { tabs, windows, generatedAt: now };
}

export function subscribeInventory(
  onChange: (snapshot: InventorySnapshot) => void,
  adapter: BrowserAdapter = getBrowserAdapter(),
): Unsub {
  let tabs: InventoryTab[] = [];
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const emit = async (nextTabs: InventoryTab[], needsFullRefresh: boolean): Promise<void> => {
    if (disposed) {
      return;
    }
    if (needsFullRefresh) {
      scheduleRefresh();
      return;
    }
    tabs = nextTabs;
    try {
      const windows = (await adapter.getWindows()).map((window) => mapBrowserWindow(window, tabs));
      onChange({ tabs, windows, generatedAt: Date.now() });
    } catch (error) {
      log.warn('Failed to refresh window list.', error);
      onChange({ tabs, windows: [], generatedAt: Date.now() });
    }
  };

  const scheduleRefresh = (): void => {
    if (refreshTimer || disposed) {
      return;
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void loadInventory(adapter)
        .then((snapshot) => {
          tabs = snapshot.tabs;
          onChange(snapshot);
        })
        .catch((error) => log.warn('Inventory refresh failed.', error));
    }, 80);
  };

  const apply = (event: InventoryEvent): void => {
    const result = reduceInventory(tabs, event);
    void emit(result.tabs, result.needsFullRefresh);
  };

  const unsubscribers = [
    adapter.onTabCreated((tab) => apply({ type: 'created', tab })),
    adapter.onTabUpdated((tabId, change) => {
      const nextChange = { ...change };
      if (change.url !== undefined) {
        nextChange.url = change.url;
      }
      apply({ type: 'updated', tabId, change: nextChange });
    }),
    adapter.onTabRemoved((tabId) => apply({ type: 'removed', tabId })),
    adapter.onTabMoved((tabId, info) => apply({ type: 'moved', tabId, ...info })),
    adapter.onTabActivated((info) => apply({ type: 'activated', ...info })),
    adapter.onTabReplaced((addedTabId, removedTabId) => apply({ type: 'replaced', addedTabId, removedTabId })),
    adapter.onWindowRemoved(() => scheduleRefresh()),
    adapter.onWindowFocusChanged(() => scheduleRefresh()),
  ];

  void loadInventory(adapter).then((snapshot) => {
    tabs = snapshot.tabs;
    onChange(snapshot);
  });

  return () => {
    disposed = true;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

export function summarizeInventory(tabs: InventoryTab[]): {
  total: number;
  pinned: number;
  restricted: number;
  uniqueHosts: number;
} {
  const hosts = new Set<string>();
  let pinned = 0;
  let restricted = 0;
  for (const tab of tabs) {
    if (tab.pinned) {
      pinned += 1;
    }
    if (tab.restricted || !tab.url || isRestrictedUrl(tab.url)) {
      restricted += 1;
      continue;
    }
    try {
      hosts.add(new URL(tab.url).hostname);
    } catch {
      hosts.add(tab.url);
    }
  }
  return {
    total: tabs.length,
    pinned,
    restricted,
    uniqueHosts: hosts.size,
  };
}
