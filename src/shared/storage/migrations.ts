import { MAX_COLLECTION_NAME_LENGTH } from '../park/operations';
import { DEFAULT_SETTINGS, mergeSettings } from '../settings/defaults';
import type {
  CleanupFailure,
  CleanupOperation,
  CleanupSkip,
  CleanupTarget,
  ClosedTabRecord,
  DuplicateNotice,
  ParkedEntry,
  PersistedState,
  PersistedStateV1,
  SkipReason,
  TabCollection,
} from '../types';

export const STORAGE_KEY = 'twintabtracker.state';
export const CURRENT_SCHEMA_VERSION = 1 as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function sanitizeParked(value: unknown): ParkedEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.id !== 'string' || typeof item.url !== 'string') {
      return [];
    }
    return [
      {
        id: item.id,
        url: item.url,
        title: typeof item.title === 'string' ? item.title : item.url,
        favIconUrl: typeof item.favIconUrl === 'string' ? item.favIconUrl : null,
        collectionId: typeof item.collectionId === 'string' ? item.collectionId : 'inbox',
        parkedAt: typeof item.parkedAt === 'number' ? item.parkedAt : Date.now(),
        sourceWindowId: typeof item.sourceWindowId === 'number' ? item.sourceWindowId : null,
        notes: typeof item.notes === 'string' ? item.notes : '',
      },
    ];
  });
}

function sanitizeCollections(value: unknown): TabCollection[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      return [];
    }
    return [
      {
        id: item.id,
        name: item.name.trim().slice(0, MAX_COLLECTION_NAME_LENGTH) || item.name.slice(0, MAX_COLLECTION_NAME_LENGTH),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      },
    ];
  });
}

const SKIP_REASONS: SkipReason[] = [
  'keep-tab',
  'not-selected',
  'protected-pinned',
  'protected-active',
  'protected-last-in-window',
  'missing',
  'navigated',
  'restricted',
  'already-closed',
  'invalid-url',
];

function sanitizeTargets(value: unknown): CleanupTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.tabId !== 'number' || typeof item.windowId !== 'number') {
      return [];
    }
    return [
      {
        tabId: item.tabId,
        windowId: item.windowId,
        url: typeof item.url === 'string' ? item.url : null,
        title: typeof item.title === 'string' ? item.title : null,
        comparisonKey: typeof item.comparisonKey === 'string' ? item.comparisonKey : '',
        groupId: typeof item.groupId === 'string' ? item.groupId : '',
      },
    ];
  });
}

function sanitizeClosed(value: unknown): ClosedTabRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.tabId !== 'number' || typeof item.windowId !== 'number') {
      return [];
    }
    return [
      {
        tabId: item.tabId,
        windowId: item.windowId,
        index: typeof item.index === 'number' ? item.index : 0,
        url: typeof item.url === 'string' ? item.url : null,
        title: typeof item.title === 'string' ? item.title : null,
        pinned: Boolean(item.pinned),
        sessionId: typeof item.sessionId === 'string' ? item.sessionId : null,
      },
    ];
  });
}

function sanitizeSkipped(value: unknown): CleanupSkip[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.tabId !== 'number' || !SKIP_REASONS.includes(item.reason as SkipReason)) {
      return [];
    }
    return [
      {
        tabId: item.tabId,
        reason: item.reason as SkipReason,
        detail: typeof item.detail === 'string' ? item.detail : undefined,
      },
    ];
  });
}

function sanitizeFailures(value: unknown): CleanupFailure[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.tabId !== 'number' || typeof item.message !== 'string') {
      return [];
    }
    return [{ tabId: item.tabId, message: item.message }];
  });
}

function sanitizeHistory(value: unknown): CleanupOperation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.id !== 'string') {
      return [];
    }
    const restoreMethod =
      item.restoreMethod === 'session' || item.restoreMethod === 'reopen-url' || item.restoreMethod === 'none'
        ? item.restoreMethod
        : 'none';
    return [
      {
        id: item.id,
        startedAt: typeof item.startedAt === 'number' ? item.startedAt : 0,
        completedAt: typeof item.completedAt === 'number' ? item.completedAt : 0,
        targets: sanitizeTargets(item.targets),
        closed: sanitizeClosed(item.closed),
        skipped: sanitizeSkipped(item.skipped),
        failures: sanitizeFailures(item.failures),
        restoreAvailable: Boolean(item.restoreAvailable),
        restoreMethod,
      },
    ];
  });
}

function sanitizeNotice(value: unknown): DuplicateNotice | null {
  if (!isObject(value) || typeof value.newTabId !== 'number' || typeof value.existingTabId !== 'number') {
    return null;
  }
  return {
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    newTabId: value.newTabId,
    existingTabId: value.existingTabId,
    url: typeof value.url === 'string' ? value.url : '',
    title: typeof value.title === 'string' ? value.title : null,
  };
}

export function emptyState(): PersistedStateV1 {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    parkedEntries: [],
    collections: [
      {
        id: 'inbox',
        name: 'Inbox',
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    cleanupHistory: [],
    lastDuplicateNotice: null,
  };
}

export function migratePersistedState(raw: unknown): PersistedState {
  if (!raw) {
    return emptyState();
  }
  if (typeof raw === 'string') {
    try {
      return migratePersistedState(JSON.parse(raw));
    } catch {
      return emptyState();
    }
  }
  if (!isObject(raw)) {
    return emptyState();
  }

  const collections = sanitizeCollections(raw.collections);
  const base = emptyState();
  return {
    version: 1,
    settings: mergeSettings(raw.settings),
    parkedEntries: sanitizeParked(raw.parkedEntries),
    collections: collections.length > 0 ? collections : base.collections,
    cleanupHistory: sanitizeHistory(raw.cleanupHistory),
    lastDuplicateNotice: sanitizeNotice(raw.lastDuplicateNotice),
  };
}
