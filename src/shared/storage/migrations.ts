import { DEFAULT_SETTINGS, mergeSettings } from '../settings/defaults';
import type {
  CleanupOperation,
  DuplicateNotice,
  ParkedEntry,
  PersistedState,
  PersistedStateV1,
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
        name: item.name,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      },
    ];
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
    return [item as unknown as CleanupOperation];
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

  const version = raw.version;
  if (version !== 1 && version != null && version !== CURRENT_SCHEMA_VERSION) {
    return {
      ...emptyState(),
      settings: mergeSettings(raw.settings),
      parkedEntries: sanitizeParked(raw.parkedEntries),
      collections: sanitizeCollections(raw.collections).length
        ? sanitizeCollections(raw.collections)
        : emptyState().collections,
      cleanupHistory: sanitizeHistory(raw.cleanupHistory),
      lastDuplicateNotice: sanitizeNotice(raw.lastDuplicateNotice),
    };
  }

  const base = emptyState();
  return {
    version: 1,
    settings: mergeSettings(raw.settings),
    parkedEntries: sanitizeParked(raw.parkedEntries),
    collections: sanitizeCollections(raw.collections).length
      ? sanitizeCollections(raw.collections)
      : base.collections,
    cleanupHistory: sanitizeHistory(raw.cleanupHistory),
    lastDuplicateNotice: sanitizeNotice(raw.lastDuplicateNotice),
  };
}
