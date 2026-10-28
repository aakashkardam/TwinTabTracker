import type {
  BrowserAdapter,
  BrowserStorageArea,
  CreateTabProps,
  RawBrowserTab,
  RawBrowserWindow,
  RawClosedSession,
  Unsub,
} from '../shared/browser/types';

type Handler<T extends unknown[]> = (...args: T) => void;

function bus<T extends unknown[]>() {
  const listeners = new Set<Handler<T>>();
  return {
    add(listener: Handler<T>): Unsub {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(...args: T): void {
      for (const listener of listeners) {
        listener(...args);
      }
    },
  };
}

export class MemoryBrowser implements BrowserAdapter {
  tabs: RawBrowserTab[] = [];
  windows: RawBrowserWindow[] = [{ id: 1, focused: true, incognito: false, type: 'normal', title: 'Window 1' }];
  closed: RawClosedSession[] = [];
  store: Record<string, unknown> = {};
  nextId = 100;
  failRemove = false;

  private created = bus<[RawBrowserTab]>();
  private updated = bus<[number, Partial<RawBrowserTab>, RawBrowserTab]>();
  private removed = bus<[number]>();
  private moved = bus<[number, { windowId: number; fromIndex: number; toIndex: number }]>();
  private activated = bus<[{ tabId: number; windowId: number }]>();
  private replaced = bus<[number, number]>();
  private windowRemoved = bus<[number]>();
  private focus = bus<[number]>();

  storage: BrowserStorageArea = {
    get: async (keys) => {
      if (!keys) {
        return { ...this.store };
      }
      if (typeof keys === 'string') {
        return { [keys]: this.store[keys] };
      }
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, this.store[key]]));
      }
      const result = { ...keys };
      for (const key of Object.keys(keys)) {
        if (key in this.store) {
          result[key] = this.store[key];
        }
      }
      return result;
    },
    set: async (items) => {
      Object.assign(this.store, items);
    },
    remove: async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete this.store[key];
      }
    },
    clear: async () => {
      this.store = {};
    },
  };

  async queryTabs(): Promise<RawBrowserTab[]> {
    return this.tabs.map((tab) => ({ ...tab }));
  }

  async getTab(tabId: number): Promise<RawBrowserTab | null> {
    return this.tabs.find((tab) => tab.id === tabId) ?? null;
  }

  async getWindows(): Promise<RawBrowserWindow[]> {
    return this.windows.map((window) => ({ ...window }));
  }

  async activateTab(tabId: number, windowId: number): Promise<void> {
    this.tabs = this.tabs.map((tab) => ({
      ...tab,
      active: tab.id === tabId,
    }));
    this.windows = this.windows.map((window) => ({ ...window, focused: window.id === windowId }));
    this.activated.emit({ tabId, windowId });
  }

  async removeTabs(tabIds: number[]): Promise<void> {
    if (this.failRemove) {
      throw new Error('tabs.remove failed');
    }
    for (const id of tabIds) {
      const tab = this.tabs.find((item) => item.id === id);
      if (tab) {
        this.closed.unshift({ tab: { ...tab, sessionId: `sess-${id}` } });
      }
    }
    this.tabs = this.tabs.filter((tab) => !tabIds.includes(tab.id ?? -1));
    for (const id of tabIds) {
      this.removed.emit(id);
    }
  }

  async createTab(props: CreateTabProps): Promise<RawBrowserTab> {
    const tab: RawBrowserTab = {
      id: this.nextId++,
      windowId: props.windowId ?? 1,
      index: props.index ?? this.tabs.length,
      url: props.url,
      title: props.url,
      active: props.active ?? false,
      pinned: props.pinned ?? false,
      status: 'complete',
    };
    this.tabs.push(tab);
    this.created.emit(tab);
    return tab;
  }

  getDashboardUrl(hash = ''): string {
    return `https://ttt.test/dashboard.html${hash}`;
  }

  async openDashboard(): Promise<void> {
    await this.createTab({ url: this.getDashboardUrl(), active: true });
  }

  async getRecentlyClosed(): Promise<RawClosedSession[]> {
    return this.closed;
  }

  async restoreSession(sessionId: string): Promise<void> {
    const match = this.closed.find((item) => item.tab?.sessionId === sessionId);
    if (!match?.tab?.url) {
      throw new Error('Unknown session');
    }
    await this.createTab({ url: match.tab.url, active: false });
  }

  async setBadge(): Promise<void> {
    return;
  }

  onTabCreated(listener: (tab: RawBrowserTab) => void): Unsub {
    return this.created.add(listener);
  }
  onTabUpdated(
    listener: (tabId: number, change: Partial<RawBrowserTab>, tab: RawBrowserTab) => void,
  ): Unsub {
    return this.updated.add(listener);
  }
  onTabRemoved(listener: (tabId: number) => void): Unsub {
    return this.removed.add(listener);
  }
  onTabMoved(
    listener: (tabId: number, moveInfo: { windowId: number; fromIndex: number; toIndex: number }) => void,
  ): Unsub {
    return this.moved.add(listener);
  }
  onTabActivated(listener: (info: { tabId: number; windowId: number }) => void): Unsub {
    return this.activated.add(listener);
  }
  onTabReplaced(listener: (addedTabId: number, removedTabId: number) => void): Unsub {
    return this.replaced.add(listener);
  }
  onWindowRemoved(listener: (windowId: number) => void): Unsub {
    return this.windowRemoved.add(listener);
  }
  onWindowFocusChanged(listener: (windowId: number) => void): Unsub {
    return this.focus.add(listener);
  }
}
