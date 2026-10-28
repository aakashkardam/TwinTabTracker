export type TabId = number;
export type WindowId = number;

export type TabLoadStatus = 'loading' | 'complete' | 'unloaded' | 'unknown';
export type MatchMode = 'exact' | 'smart';
export type DuplicateNoticeMode = 'off' | 'badge' | 'banner';
export type ThemePreference = 'system' | 'light' | 'dark';
export type DashboardView =
  | 'overview'
  | 'duplicates'
  | 'tabs'
  | 'parked'
  | 'collections'
  | 'settings';
export type TabSortKey = 'title' | 'domain' | 'window' | 'url';
export type TabFilterKey = 'all' | 'pinned' | 'active' | 'duplicated' | 'restricted';

export interface InventoryTab {
  id: TabId;
  windowId: WindowId;
  index: number;
  url: string | null;
  title: string | null;
  favIconUrl: string | null;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  muted: boolean;
  discarded: boolean;
  highlighted: boolean;
  incognito: boolean;
  status: TabLoadStatus;
  groupId: number | null;
  restricted: boolean;
  observedAt: number;
}

export interface InventoryWindow {
  id: WindowId;
  focused: boolean;
  incognito: boolean;
  type: string;
  tabCount: number;
  title: string | null;
}

export interface InventorySnapshot {
  tabs: InventoryTab[];
  windows: InventoryWindow[];
  generatedAt: number;
}

export type DuplicateWarning =
  | 'pinned-member'
  | 'active-member'
  | 'restricted-member'
  | 'cross-window'
  | 'all-protected';

export interface DuplicateGroup {
  id: string;
  comparisonKey: string;
  members: InventoryTab[];
  copyCount: number;
  keepTabId: TabId;
  extraCount: number;
  warnings: DuplicateWarning[];
}

export interface AppSettings {
  matchMode: MatchMode;
  stripTrackingParams: boolean;
  extraTrackingParams: string[];
  ignoreFragmentInSmartMode: boolean;
  protectPinned: boolean;
  protectActive: boolean;
  protectLastTabInWindow: boolean;
  duplicateNotice: DuplicateNoticeMode;
  theme: ThemePreference;
  cleanupHistoryLimit: number;
  deleteParkedAfterRestore: boolean;
  defaultDashboardView: DashboardView;
}

export type SkipReason =
  | 'keep-tab'
  | 'not-selected'
  | 'protected-pinned'
  | 'protected-active'
  | 'protected-last-in-window'
  | 'missing'
  | 'navigated'
  | 'restricted'
  | 'already-closed'
  | 'invalid-url';

export interface CleanupTarget {
  tabId: TabId;
  windowId: WindowId;
  url: string | null;
  title: string | null;
  comparisonKey: string;
  groupId: string;
}

export interface CleanupSkip {
  tabId: TabId;
  reason: SkipReason;
  detail?: string;
}

export interface CleanupFailure {
  tabId: TabId;
  message: string;
}

export interface ClosedTabRecord {
  tabId: TabId;
  windowId: WindowId;
  index: number;
  url: string | null;
  title: string | null;
  pinned: boolean;
  sessionId: string | null;
}

export interface CleanupOperation {
  id: string;
  startedAt: number;
  completedAt: number;
  targets: CleanupTarget[];
  closed: ClosedTabRecord[];
  skipped: CleanupSkip[];
  failures: CleanupFailure[];
  restoreAvailable: boolean;
  restoreMethod: 'session' | 'reopen-url' | 'none';
}

export interface ParkedEntry {
  id: string;
  url: string;
  title: string;
  favIconUrl: string | null;
  collectionId: string;
  parkedAt: number;
  sourceWindowId: WindowId | null;
  notes: string;
}

export interface TabCollection {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface DuplicateNotice {
  createdAt: number;
  newTabId: TabId;
  existingTabId: TabId;
  url: string;
  title: string | null;
}

export interface PersistedStateV1 {
  version: 1;
  settings: AppSettings;
  parkedEntries: ParkedEntry[];
  collections: TabCollection[];
  cleanupHistory: CleanupOperation[];
  lastDuplicateNotice: DuplicateNotice | null;
}

export type PersistedState = PersistedStateV1;

export interface NormalizeOptions {
  mode: MatchMode;
  stripTrackingParams: boolean;
  extraTrackingParams: string[];
  ignoreFragment: boolean;
}

export interface SearchResult {
  tab: InventoryTab;
  score: number;
  matchField: 'title' | 'hostname' | 'url';
}
