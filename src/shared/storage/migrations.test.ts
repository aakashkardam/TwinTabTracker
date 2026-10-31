import { describe, expect, it } from 'vitest';
import { migratePersistedState } from './migrations';

describe('storage migrations', () => {
  it('returns defaults for missing data', () => {
    const state = migratePersistedState(null);
    expect(state.version).toBe(1);
    expect(state.settings.matchMode).toBe('exact');
    expect(state.collections[0]?.id).toBe('inbox');
  });

  it('recovers from corrupt JSON and unknown versions', () => {
    expect(migratePersistedState('{not json').settings.protectPinned).toBe(true);
    const migrated = migratePersistedState({
      version: 99,
      settings: { matchMode: 'smart', protectPinned: false },
      parkedEntries: [{ id: 'p1', url: 'https://example.com', title: 'Saved' }],
    });
    expect(migrated.settings.matchMode).toBe('smart');
    expect(migrated.parkedEntries).toHaveLength(1);
  });

  it('drops malformed parked records', () => {
    const state = migratePersistedState({
      version: 1,
      parkedEntries: [null, { id: 1 }, { id: 'ok', url: 'https://example.com', title: 'Ok' }],
    });
    expect(state.parkedEntries).toHaveLength(1);
  });

  it('drops malformed cleanup history instead of trusting a shallow cast', () => {
    const state = migratePersistedState({
      version: 1,
      cleanupHistory: [
        { id: 'ok', targets: [{ tabId: 1, windowId: 1 }], closed: 'nope', skipped: [], failures: [] },
        { notAnOperation: true },
      ],
    });
    expect(state.cleanupHistory).toHaveLength(1);
    expect(state.cleanupHistory[0]?.id).toBe('ok');
    expect(state.cleanupHistory[0]?.closed).toEqual([]);
  });
});
