import { getBrowserAdapter } from '../browser/adapter';
import type { BrowserAdapter } from '../browser/types';
import { log } from '../log';
import type { AppSettings, CleanupOperation, PersistedState } from '../types';
import { migratePersistedState, STORAGE_KEY } from './migrations';

export class StorageClient {
  constructor(private readonly adapter: BrowserAdapter) {}

  async read(): Promise<PersistedState> {
    try {
      const raw = await this.adapter.storage.get(STORAGE_KEY);
      return migratePersistedState(raw[STORAGE_KEY]);
    } catch (error) {
      log.warn('Failed to read extension storage; using defaults.', error);
      return migratePersistedState(null);
    }
  }

  async write(state: PersistedState): Promise<void> {
    await this.adapter.storage.set({ [STORAGE_KEY]: state });
  }

  async update(mutator: (state: PersistedState) => PersistedState): Promise<PersistedState> {
    const current = await this.read();
    const next = mutator(current);
    try {
      await this.write(next);
      return next;
    } catch (error) {
      log.warn('Failed to write extension storage.', error);
      throw error;
    }
  }

  async saveSettings(settings: AppSettings): Promise<PersistedState> {
    return this.update((state) => ({ ...state, settings }));
  }

  async pushCleanup(operation: CleanupOperation, limit: number): Promise<PersistedState> {
    return this.update((state) => ({
      ...state,
      cleanupHistory: [operation, ...state.cleanupHistory].slice(0, Math.max(1, limit)),
    }));
  }
}

export function createStorageClient(adapter = getBrowserAdapter()): StorageClient {
  return new StorageClient(adapter);
}
