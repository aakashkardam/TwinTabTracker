import type { InventoryTab, InventoryWindow, TabLoadStatus } from '../types';
import { isRestrictedUrl } from '../url/restricted';
import type { RawBrowserTab, RawBrowserWindow } from '../browser/types';

function mapStatus(status: string | undefined): TabLoadStatus {
  if (status === 'loading' || status === 'complete' || status === 'unloaded') {
    return status;
  }
  return 'unknown';
}

export function mapBrowserTab(raw: RawBrowserTab, observedAt = Date.now()): InventoryTab {
  const url = raw.url ?? null;
  return {
    id: raw.id ?? -1,
    windowId: raw.windowId ?? -1,
    index: raw.index ?? 0,
    url,
    title: raw.title ?? null,
    favIconUrl: raw.favIconUrl ?? null,
    active: Boolean(raw.active),
    pinned: Boolean(raw.pinned),
    audible: Boolean(raw.audible),
    muted: Boolean(raw.mutedInfo?.muted),
    discarded: Boolean(raw.discarded),
    highlighted: Boolean(raw.highlighted),
    incognito: Boolean(raw.incognito),
    status: mapStatus(raw.status),
    groupId: typeof raw.groupId === 'number' && raw.groupId >= 0 ? raw.groupId : null,
    restricted: isRestrictedUrl(url),
    lastAccessed: typeof raw.lastAccessed === 'number' && raw.lastAccessed > 0 ? raw.lastAccessed : null,
    observedAt,
  };
}

export function mapBrowserWindow(
  raw: RawBrowserWindow,
  tabs: InventoryTab[],
): InventoryWindow {
  const windowTabs = tabs.filter((tab) => tab.windowId === raw.id);
  const active = windowTabs.find((tab) => tab.active);
  return {
    id: raw.id ?? -1,
    focused: Boolean(raw.focused),
    incognito: Boolean(raw.incognito),
    type: raw.type ?? 'normal',
    tabCount: windowTabs.length,
    title: active?.title ?? raw.title ?? null,
  };
}
