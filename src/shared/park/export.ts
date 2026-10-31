import { createId } from '../id';
import type { ParkedEntry, PersistedState, TabCollection } from '../types';
import { INBOX_COLLECTION_ID, normalizeCollectionName } from './operations';

export const PARK_EXPORT_KIND = 'twintabtracker.parked';
export const PARK_EXPORT_VERSION = 1 as const;

export interface ParkedExport {
  kind: typeof PARK_EXPORT_KIND;
  version: typeof PARK_EXPORT_VERSION;
  exportedAt: number;
  collections: TabCollection[];
  parkedEntries: ParkedEntry[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export function exportParkedData(state: PersistedState, now = Date.now()): ParkedExport {
  return {
    kind: PARK_EXPORT_KIND,
    version: PARK_EXPORT_VERSION,
    exportedAt: now,
    collections: state.collections,
    parkedEntries: state.parkedEntries,
  };
}

export function parseParkedExport(raw: unknown): ParkedExport | null {
  const value = typeof raw === 'string' ? safeParse(raw) : raw;
  if (!isObject(value) || value.kind !== PARK_EXPORT_KIND || value.version !== PARK_EXPORT_VERSION) {
    return null;
  }
  if (!Array.isArray(value.collections) || !Array.isArray(value.parkedEntries)) {
    return null;
  }
  const collections = value.collections.flatMap((item) => {
    if (!isObject(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      return [];
    }
    return [
      {
        id: item.id,
        name: normalizeCollectionName(item.name, 'Imported collection'),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      } satisfies TabCollection,
    ];
  });
  const parkedEntries = value.parkedEntries.flatMap((item) => {
    if (!isObject(item) || typeof item.url !== 'string' || !item.url.trim()) {
      return [];
    }
    return [
      {
        id: typeof item.id === 'string' ? item.id : createId('park'),
        url: item.url,
        title: typeof item.title === 'string' && item.title.trim() ? item.title : item.url,
        favIconUrl: typeof item.favIconUrl === 'string' ? item.favIconUrl : null,
        collectionId: typeof item.collectionId === 'string' ? item.collectionId : INBOX_COLLECTION_ID,
        parkedAt: typeof item.parkedAt === 'number' ? item.parkedAt : Date.now(),
        sourceWindowId: typeof item.sourceWindowId === 'number' ? item.sourceWindowId : null,
        notes: typeof item.notes === 'string' ? item.notes : '',
      } satisfies ParkedEntry,
    ];
  });
  return {
    kind: PARK_EXPORT_KIND,
    version: PARK_EXPORT_VERSION,
    exportedAt: typeof value.exportedAt === 'number' ? value.exportedAt : Date.now(),
    collections,
    parkedEntries,
  };
}

export function mergeParkedImport(state: PersistedState, payload: ParkedExport, now = Date.now()): PersistedState {
  const collections = [...state.collections];
  const idMap = new Map<string, string>();

  for (const incoming of payload.collections) {
    if (incoming.id === INBOX_COLLECTION_ID) {
      idMap.set(incoming.id, INBOX_COLLECTION_ID);
      continue;
    }
    const existing = collections.find(
      (collection) => collection.id === incoming.id || collection.name.toLowerCase() === incoming.name.toLowerCase(),
    );
    if (existing) {
      idMap.set(incoming.id, existing.id);
      continue;
    }
    const created: TabCollection = {
      ...incoming,
      id: collections.some((collection) => collection.id === incoming.id) ? createId('col') : incoming.id,
      updatedAt: now,
    };
    collections.push(created);
    idMap.set(incoming.id, created.id);
  }

  const nextEntries = [...state.parkedEntries];
  for (const incoming of payload.parkedEntries) {
    const collectionId = idMap.get(incoming.collectionId) ?? INBOX_COLLECTION_ID;
    const duplicate = nextEntries.some(
      (entry) => entry.collectionId === collectionId && entry.url.trim() === incoming.url.trim(),
    );
    if (duplicate) {
      continue;
    }
    nextEntries.unshift({
      ...incoming,
      id: nextEntries.some((entry) => entry.id === incoming.id) ? createId('park') : incoming.id,
      collectionId,
    });
  }

  return {
    ...state,
    collections,
    parkedEntries: nextEntries,
  };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
