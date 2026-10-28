import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { emptyState } from '../storage/migrations';
import {
  createCollection,
  deleteCollection,
  deleteParkedEntries,
  parkTabs,
  renameCollection,
  searchParked,
} from './operations';

describe('parked tabs and collections', () => {
  it('parks tabs and de-duplicates the same URL in a collection', () => {
    const first = parkTabs(emptyState(), [tab({ id: 1, url: 'https://example.com/a', title: 'A' })], 'inbox', 1);
    const second = parkTabs(first, [tab({ id: 2, url: 'https://example.com/a', title: 'A2' })], 'inbox', 2);
    expect(second.parkedEntries).toHaveLength(1);
    expect(second.parkedEntries[0]?.title).toBe('A2');
  });

  it('renames collections and moves entries to inbox on delete', () => {
    const created = createCollection('Research', 1);
    let state = emptyState();
    state = { ...state, collections: [...state.collections, created] };
    state = parkTabs(state, [tab({ id: 1, url: 'https://example.com/r' })], created.id, 2);
    state = renameCollection(state, created.id, 'Deep research', 3);
    expect(state.collections.find((item) => item.id === created.id)?.name).toBe('Deep research');
    state = deleteCollection(state, created.id);
    expect(state.parkedEntries[0]?.collectionId).toBe('inbox');
  });

  it('searches and deletes parked entries', () => {
    let state = parkTabs(emptyState(), [tab({ id: 1, url: 'https://example.com/docs', title: 'Docs' })], 'inbox');
    expect(searchParked(state.parkedEntries, 'docs')).toHaveLength(1);
    state = deleteParkedEntries(state, [state.parkedEntries[0]!.id]);
    expect(state.parkedEntries).toHaveLength(0);
  });
});
