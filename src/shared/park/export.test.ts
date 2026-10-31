import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { emptyState } from '../storage/migrations';
import { exportParkedData, mergeParkedImport, parseParkedExport } from './export';
import { createCollection, parkTabs } from './operations';

describe('parked export and import', () => {
  it('round-trips parked tabs and skips duplicate URLs on import', () => {
    const created = createCollection('Research', 1);
    let state = { ...emptyState(), collections: [...emptyState().collections, created] };
    state = parkTabs(state, [tab({ id: 1, url: 'https://example.com/r', title: 'Notes' })], created.id, 2);
    const payload = exportParkedData(state, 3);
    expect(parseParkedExport(JSON.stringify(payload))?.parkedEntries).toHaveLength(1);

    const merged = mergeParkedImport(emptyState(), payload, 4);
    expect(merged.parkedEntries).toHaveLength(1);
    expect(merged.collections.some((collection) => collection.name === 'Research')).toBe(true);

    const again = mergeParkedImport(merged, payload, 5);
    expect(again.parkedEntries).toHaveLength(1);
  });

  it('rejects unrelated JSON', () => {
    expect(parseParkedExport({ version: 1, parkedEntries: [] })).toBeNull();
  });
});
