import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { findStaleTabs, staleReasons } from './stale';

describe('stale tab heuristics', () => {
  const now = 1_000_000_000_000;

  it('flags discarded and long-idle tabs but not active or pinned tabs', () => {
    const discarded = tab({ id: 1, discarded: true, active: false });
    const idle = tab({ id: 2, lastAccessed: now - 8 * 24 * 60 * 60 * 1000, active: false });
    const active = tab({ id: 3, discarded: true, active: true });
    const pinned = tab({ id: 4, discarded: true, pinned: true, active: false });

    expect(staleReasons(discarded, now)).toContain('discarded');
    expect(staleReasons(idle, now)).toContain('inactive');
    expect(staleReasons(active, now)).toEqual([]);
    expect(staleReasons(pinned, now)).toEqual([]);
    expect(findStaleTabs([discarded, idle, active, pinned], now)).toHaveLength(2);
  });
});
