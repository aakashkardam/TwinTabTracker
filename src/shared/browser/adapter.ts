import type {
  BrowserAdapter,
  BrowserStorageArea,
  CreateTabProps,
  RawBrowserTab,
  RawBrowserWindow,
  RawClosedSession,
  Unsub,
} from './types';
import {
  BrowserUnavailableError,
  getAdapterOverride,
  getChromeLike,
  subscribe,
  type ChromeLike,
} from './runtime';

const DASHBOARD_CANDIDATES = [
  'src/dashboard/index.html',
  'dashboard/index.html',
  'dashboard.html',
];

function asTab(value: unknown): RawBrowserTab {
  return (value ?? {}) as RawBrowserTab;
}

function dashboardPath(api: ChromeLike): string {
  const fromManifest = api.runtime?.getManifest?.().options_ui?.page;
  if (fromManifest) {
    return fromManifest;
  }
  return DASHBOARD_CANDIDATES[0] ?? 'src/dashboard/index.html';
}

class WebExtensionAdapter implements BrowserAdapter {
  storage: BrowserStorageArea;

  constructor(private readonly api: ChromeLike) {
    if (!api.storage?.local) {
      throw new BrowserUnavailableError('storage.local is unavailable.');
    }
    this.storage = {
      get: async (keys) => api.storage!.local.get(keys ?? null),
      set: async (items) => api.storage!.local.set(items),
      remove: async (keys) => api.storage!.local.remove(keys),
      clear: async () => api.storage!.local.clear(),
    };
  }

  async queryTabs(): Promise<RawBrowserTab[]> {
    if (!this.api.tabs?.query) {
      throw new BrowserUnavailableError('tabs.query is unavailable.');
    }
    const tabs = await this.api.tabs.query({});
    return tabs.map(asTab);
  }

  async getTab(tabId: number): Promise<RawBrowserTab | null> {
    if (!this.api.tabs?.get) {
      return null;
    }
    try {
      return asTab(await this.api.tabs.get(tabId));
    } catch {
      return null;
    }
  }

  async getWindows(): Promise<RawBrowserWindow[]> {
    if (!this.api.windows?.getAll) {
      return [];
    }
    const windows = await this.api.windows.getAll({ populate: false });
    return windows as RawBrowserWindow[];
  }

  async activateTab(tabId: number, windowId: number): Promise<void> {
    if (!this.api.tabs?.update) {
      throw new BrowserUnavailableError('tabs.update is unavailable.');
    }
    await this.api.tabs.update(tabId, { active: true });
    if (this.api.windows?.update && windowId >= 0) {
      await this.api.windows.update(windowId, { focused: true });
    }
  }

  async removeTabs(tabIds: number[]): Promise<void> {
    if (tabIds.length === 0) {
      return;
    }
    if (!this.api.tabs?.remove) {
      throw new BrowserUnavailableError('tabs.remove is unavailable.');
    }
    try {
      await this.api.tabs.remove(tabIds);
    } catch {
      for (const id of tabIds) {
        try {
          await this.api.tabs.remove(id);
        } catch {
          // Caller revalidates remaining tabs.
        }
      }
    }
  }

  async createTab(props: CreateTabProps): Promise<RawBrowserTab> {
    if (!this.api.tabs?.create) {
      throw new BrowserUnavailableError('tabs.create is unavailable.');
    }
    return asTab(await this.api.tabs.create({ ...props }));
  }

  getDashboardUrl(hash = ''): string {
    if (!this.api.runtime?.getURL) {
      throw new BrowserUnavailableError('runtime.getURL is unavailable.');
    }
    const base = this.api.runtime.getURL(dashboardPath(this.api));
    if (!hash) {
      return base;
    }
    return `${base}${hash.startsWith('#') ? hash : `#${hash}`}`;
  }

  async openDashboard(hash = ''): Promise<void> {
    const url = this.getDashboardUrl(hash);
    const existing = this.api.tabs?.query
      ? ((await this.api.tabs.query({ url: this.getDashboardUrl() })) as RawBrowserTab[])
      : [];
    const first = existing[0];
    if (first?.id != null && first.windowId != null) {
      if (hash) {
        await this.api.tabs?.update?.(first.id, { url, active: true });
      } else {
        await this.activateTab(first.id, first.windowId);
      }
      return;
    }
    await this.createTab({ url, active: true });
  }

  async getRecentlyClosed(maxResults = 25): Promise<RawClosedSession[]> {
    if (!this.api.sessions?.getRecentlyClosed) {
      return [];
    }
    const sessions = await this.api.sessions.getRecentlyClosed({ maxResults });
    return sessions as RawClosedSession[];
  }

  async restoreSession(sessionId: string): Promise<void> {
    if (!this.api.sessions?.restore) {
      throw new BrowserUnavailableError('sessions.restore is unavailable.');
    }
    await this.api.sessions.restore(sessionId);
  }

  async setBadge(text: string, color = '#0F6E6A'): Promise<void> {
    const action = this.api.action ?? this.api.browserAction;
    if (!action?.setBadgeText) {
      return;
    }
    await action.setBadgeText({ text });
    await action.setBadgeBackgroundColor({ color });
    if (this.api.action?.setBadgeTextColor) {
      await this.api.action.setBadgeTextColor({ color: '#FFFFFF' });
    }
  }

  onTabCreated(listener: (tab: RawBrowserTab) => void): Unsub {
    return subscribe(this.api.tabs?.onCreated, (tab) => listener(asTab(tab)));
  }

  onTabUpdated(
    listener: (tabId: number, change: Partial<RawBrowserTab>, tab: RawBrowserTab) => void,
  ): Unsub {
    return subscribe(this.api.tabs?.onUpdated, (tabId, change, tab) =>
      listener(tabId, change as Partial<RawBrowserTab>, asTab(tab)),
    );
  }

  onTabRemoved(listener: (tabId: number) => void): Unsub {
    return subscribe(this.api.tabs?.onRemoved, listener);
  }

  onTabMoved(
    listener: (tabId: number, moveInfo: { windowId: number; fromIndex: number; toIndex: number }) => void,
  ): Unsub {
    return subscribe(this.api.tabs?.onMoved, (tabId, info) =>
      listener(tabId, info as { windowId: number; fromIndex: number; toIndex: number }),
    );
  }

  onTabActivated(listener: (info: { tabId: number; windowId: number }) => void): Unsub {
    return subscribe(this.api.tabs?.onActivated, (info) =>
      listener(info as { tabId: number; windowId: number }),
    );
  }

  onTabReplaced(listener: (addedTabId: number, removedTabId: number) => void): Unsub {
    return subscribe(this.api.tabs?.onReplaced, listener);
  }

  onWindowRemoved(listener: (windowId: number) => void): Unsub {
    return subscribe(this.api.windows?.onRemoved, listener);
  }

  onWindowFocusChanged(listener: (windowId: number) => void): Unsub {
    return subscribe(this.api.windows?.onFocusChanged, listener);
  }
}

export function getBrowserAdapter(): BrowserAdapter {
  const override = getAdapterOverride();
  if (override) {
    return override;
  }
  return new WebExtensionAdapter(getChromeLike());
}

export function createWebExtensionAdapter(): BrowserAdapter {
  return new WebExtensionAdapter(getChromeLike());
}
