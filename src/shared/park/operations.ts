import { createId } from '../id';
import type { InventoryTab, ParkedEntry, PersistedState, TabCollection } from '../types';

export const INBOX_COLLECTION_ID = 'inbox';
export const MAX_COLLECTION_NAME_LENGTH = 80;

export function normalizeCollectionName(name: string, fallback = 'Untitled collection'): string {
  const trimmed = name.trim().slice(0, MAX_COLLECTION_NAME_LENGTH);
  return trimmed || fallback.slice(0, MAX_COLLECTION_NAME_LENGTH);
}

export function createCollection(name: string, now = Date.now()): TabCollection {
  return {
    id: createId('col'),
    name: normalizeCollectionName(name),
    createdAt: now,
    updatedAt: now,
  };
}

export function renameCollection(
  state: PersistedState,
  collectionId: string,
  name: string,
  now = Date.now(),
): PersistedState {
  const trimmed = normalizeCollectionName(name, '');
  return {
    ...state,
    collections: state.collections.map((collection) =>
      collection.id === collectionId
        ? { ...collection, name: trimmed || collection.name, updatedAt: now }
        : collection,
    ),
  };
}

export function deleteCollection(state: PersistedState, collectionId: string): PersistedState {
  if (collectionId === INBOX_COLLECTION_ID) {
    return state;
  }
  return {
    ...state,
    collections: state.collections.filter((collection) => collection.id !== collectionId),
    parkedEntries: state.parkedEntries.map((entry) =>
      entry.collectionId === collectionId ? { ...entry, collectionId: INBOX_COLLECTION_ID } : entry,
    ),
  };
}

function sameParkedUrl(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

export function parkTabs(
  state: PersistedState,
  tabs: InventoryTab[],
  collectionId: string,
  now = Date.now(),
): PersistedState {
  const targetCollection = state.collections.some((collection) => collection.id === collectionId)
    ? collectionId
    : INBOX_COLLECTION_ID;
  const nextEntries = [...state.parkedEntries];

  for (const tab of tabs) {
    if (!tab.url || tab.restricted) {
      continue;
    }
    const url = tab.url;
    const duplicate = nextEntries.find(
      (entry) => entry.collectionId === targetCollection && sameParkedUrl(entry.url, url),
    );
    if (duplicate) {
      const index = nextEntries.indexOf(duplicate);
      nextEntries[index] = {
        ...duplicate,
        title: tab.title ?? duplicate.title,
        favIconUrl: tab.favIconUrl ?? duplicate.favIconUrl,
        parkedAt: now,
        sourceWindowId: tab.windowId,
      };
      continue;
    }
    nextEntries.unshift({
      id: createId('park'),
      url,
      title: tab.title || tab.url,
      favIconUrl: tab.favIconUrl,
      collectionId: targetCollection,
      parkedAt: now,
      sourceWindowId: tab.windowId,
      notes: '',
    });
  }

  return {
    ...state,
    parkedEntries: nextEntries,
    collections: state.collections.map((collection) =>
      collection.id === targetCollection ? { ...collection, updatedAt: now } : collection,
    ),
  };
}

export function deleteParkedEntries(state: PersistedState, ids: string[]): PersistedState {
  const remove = new Set(ids);
  return {
    ...state,
    parkedEntries: state.parkedEntries.filter((entry) => !remove.has(entry.id)),
  };
}

export function moveParkedEntries(
  state: PersistedState,
  ids: string[],
  collectionId: string,
  now = Date.now(),
): PersistedState {
  const move = new Set(ids);
  const target = state.collections.some((collection) => collection.id === collectionId)
    ? collectionId
    : INBOX_COLLECTION_ID;
  return {
    ...state,
    parkedEntries: state.parkedEntries.map((entry) =>
      move.has(entry.id) ? { ...entry, collectionId: target } : entry,
    ),
    collections: state.collections.map((collection) =>
      collection.id === target ? { ...collection, updatedAt: now } : collection,
    ),
  };
}

export function searchParked(entries: ParkedEntry[], query: string): ParkedEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return entries;
  }
  return entries.filter((entry) => {
    return (
      entry.title.toLowerCase().includes(needle) ||
      entry.url.toLowerCase().includes(needle) ||
      entry.notes.toLowerCase().includes(needle)
    );
  });
}
