import { describe, expect, it } from 'vitest';
import { MemoryBrowser } from '../../test/memory-browser';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import { StorageClient } from './client';

describe('storage client', () => {
  it('persists settings and cleanup history with a bounded list', async () => {
    const browser = new MemoryBrowser();
    const client = new StorageClient(browser);
    await client.saveSettings({ ...DEFAULT_SETTINGS, theme: 'dark' });
    const first = await client.read();
    expect(first.settings.theme).toBe('dark');
    await client.pushCleanup(
      {
        id: 'cleanup-1',
        startedAt: 1,
        completedAt: 2,
        targets: [],
        closed: [],
        skipped: [],
        failures: [],
        restoreAvailable: false,
        restoreMethod: 'none',
      },
      1,
    );
    await client.pushCleanup(
      {
        id: 'cleanup-2',
        startedAt: 3,
        completedAt: 4,
        targets: [],
        closed: [],
        skipped: [],
        failures: [],
        restoreAvailable: false,
        restoreMethod: 'none',
      },
      1,
    );
    const next = await client.read();
    expect(next.cleanupHistory).toHaveLength(1);
    expect(next.cleanupHistory[0]?.id).toBe('cleanup-2');
  });
});
