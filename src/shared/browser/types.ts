export interface RawMutedInfo {
  muted?: boolean;
}

export interface RawBrowserTab {
  id?: number;
  index?: number;
  windowId?: number;
  highlighted?: boolean;
  active?: boolean;
  pinned?: boolean;
  audible?: boolean;
  discarded?: boolean;
  incognito?: boolean;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: string;
  groupId?: number;
  mutedInfo?: RawMutedInfo;
}

export interface RawBrowserWindow {
  id?: number;
  focused?: boolean;
  incognito?: boolean;
  type?: string;
  title?: string;
}

export interface RawClosedSession {
  lastModified?: number;
  tab?: RawBrowserTab & { sessionId?: string };
  window?: {
    sessionId?: string;
    tabs?: RawBrowserTab[];
  };
}

export interface CreateTabProps {
  url?: string;
  windowId?: number;
  index?: number;
  active?: boolean;
  pinned?: boolean;
}

export interface BrowserStorageArea {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export type Unsub = () => void;

export interface BrowserAdapter {
  queryTabs(): Promise<RawBrowserTab[]>;
  getTab(tabId: number): Promise<RawBrowserTab | null>;
  getWindows(): Promise<RawBrowserWindow[]>;
  activateTab(tabId: number, windowId: number): Promise<void>;
  removeTabs(tabIds: number[]): Promise<void>;
  createTab(props: CreateTabProps): Promise<RawBrowserTab>;
  openDashboard(hash?: string): Promise<void>;
  getRecentlyClosed(maxResults?: number): Promise<RawClosedSession[]>;
  restoreSession(sessionId: string): Promise<void>;
  setBadge(text: string, color?: string): Promise<void>;
  getDashboardUrl(hash?: string): string;
  storage: BrowserStorageArea;
  onTabCreated(listener: (tab: RawBrowserTab) => void): Unsub;
  onTabUpdated(
    listener: (tabId: number, change: Partial<RawBrowserTab>, tab: RawBrowserTab) => void,
  ): Unsub;
  onTabRemoved(listener: (tabId: number) => void): Unsub;
  onTabMoved(
    listener: (tabId: number, moveInfo: { windowId: number; fromIndex: number; toIndex: number }) => void,
  ): Unsub;
  onTabActivated(listener: (info: { tabId: number; windowId: number }) => void): Unsub;
  onTabReplaced(listener: (addedTabId: number, removedTabId: number) => void): Unsub;
  onWindowRemoved(listener: (windowId: number) => void): Unsub;
  onWindowFocusChanged(listener: (windowId: number) => void): Unsub;
}
