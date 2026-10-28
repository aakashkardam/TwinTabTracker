import type { InventoryTab, TabId } from '../types';
import { mapBrowserTab } from './map';
import type { RawBrowserTab } from '../browser/types';
import { isRestrictedUrl } from '../url/restricted';

export type InventoryEvent =
  | { type: 'created'; tab: RawBrowserTab }
  | { type: 'updated'; tabId: TabId; change: Partial<RawBrowserTab> & { url?: string } }
  | { type: 'removed'; tabId: TabId }
  | {
      type: 'moved';
      tabId: TabId;
      windowId: number;
      fromIndex: number;
      toIndex: number;
    }
  | { type: 'activated'; tabId: TabId; windowId: number }
  | { type: 'replaced'; addedTabId: TabId; removedTabId: TabId };

export interface ReduceResult {
  tabs: InventoryTab[];
  needsFullRefresh: boolean;
}

function replace(tabs: InventoryTab[], tabId: TabId, next: InventoryTab): InventoryTab[] {
  return tabs.map((tab) => (tab.id === tabId ? next : tab));
}

export function reduceInventory(tabs: InventoryTab[], event: InventoryEvent, now = Date.now()): ReduceResult {
  switch (event.type) {
    case 'created': {
      if (event.tab.id == null) {
        return { tabs, needsFullRefresh: true };
      }
      if (tabs.some((tab) => tab.id === event.tab.id)) {
        return {
          tabs: replace(tabs, event.tab.id, mapBrowserTab(event.tab, now)),
          needsFullRefresh: false,
        };
      }
      return { tabs: [...tabs, mapBrowserTab(event.tab, now)], needsFullRefresh: false };
    }
    case 'updated': {
      const current = tabs.find((tab) => tab.id === event.tabId);
      if (!current) {
        return { tabs, needsFullRefresh: true };
      }
      const merged: InventoryTab = {
        ...current,
        url: event.change.url === undefined ? current.url : event.change.url,
        title: event.change.title === undefined ? current.title : event.change.title ?? null,
        favIconUrl:
          event.change.favIconUrl === undefined ? current.favIconUrl : event.change.favIconUrl ?? null,
        pinned: event.change.pinned === undefined ? current.pinned : Boolean(event.change.pinned),
        audible: event.change.audible === undefined ? current.audible : Boolean(event.change.audible),
        discarded:
          event.change.discarded === undefined ? current.discarded : Boolean(event.change.discarded),
        status:
          event.change.status === 'loading' ||
          event.change.status === 'complete' ||
          event.change.status === 'unloaded'
            ? event.change.status
            : current.status,
        groupId:
          event.change.groupId === undefined
            ? current.groupId
            : typeof event.change.groupId === 'number' && event.change.groupId >= 0
              ? event.change.groupId
              : null,
        observedAt: now,
      };
      merged.restricted = isRestrictedUrl(merged.url);
      return { tabs: replace(tabs, event.tabId, merged), needsFullRefresh: false };
    }
    case 'removed':
      return { tabs: tabs.filter((tab) => tab.id !== event.tabId), needsFullRefresh: false };
    case 'moved': {
      const current = tabs.find((tab) => tab.id === event.tabId);
      if (!current) {
        return { tabs, needsFullRefresh: true };
      }
      const next = tabs.map((tab) => {
        if (tab.id === event.tabId) {
          return { ...tab, windowId: event.windowId, index: event.toIndex, observedAt: now };
        }
        if (tab.windowId !== event.windowId && tab.windowId !== current.windowId) {
          return tab;
        }
        return tab;
      });
      return { tabs: next, needsFullRefresh: false };
    }
    case 'activated': {
      const exists = tabs.some((tab) => tab.id === event.tabId);
      if (!exists) {
        return { tabs, needsFullRefresh: true };
      }
      return {
        tabs: tabs.map((tab) => {
          if (tab.windowId !== event.windowId) {
            return tab;
          }
          return {
            ...tab,
            active: tab.id === event.tabId,
            observedAt: tab.id === event.tabId ? now : tab.observedAt,
          };
        }),
        needsFullRefresh: false,
      };
    }
    case 'replaced': {
      const current = tabs.find((tab) => tab.id === event.removedTabId);
      if (!current) {
        return { tabs, needsFullRefresh: true };
      }
      return {
        tabs: tabs.map((tab) =>
          tab.id === event.removedTabId ? { ...tab, id: event.addedTabId, observedAt: now } : tab,
        ),
        needsFullRefresh: false,
      };
    }
    default:
      return { tabs, needsFullRefresh: true };
  }
}
