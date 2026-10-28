import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import { detectDuplicateGroups } from './detect';

const exactSettings = { ...DEFAULT_SETTINGS, matchMode: 'exact' as const };
const smartSettings = { ...DEFAULT_SETTINGS, matchMode: 'smart' as const };

describe('duplicate detection', () => {
  it('groups three or more identical URLs', () => {
    const groups = detectDuplicateGroups(
      [
        tab({ id: 1, url: 'https://example.com/a', title: 'A1' }),
        tab({ id: 2, url: 'https://example.com/a', title: 'A2' }),
        tab({ id: 3, url: 'https://example.com/a', title: 'A3' }),
      ],
      exactSettings,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.copyCount).toBe(3);
    expect(groups[0]?.extraCount).toBe(2);
  });

  it('groups identical URLs across windows', () => {
    const groups = detectDuplicateGroups(
      [
        tab({ id: 1, windowId: 1, url: 'https://example.com/a' }),
        tab({ id: 2, windowId: 2, url: 'https://example.com/a' }),
      ],
      exactSettings,
    );
    expect(groups[0]?.warnings).toContain('cross-window');
  });

  it('creates multiple groups when needed', () => {
    const groups = detectDuplicateGroups(
      [
        tab({ id: 1, url: 'https://example.com/a' }),
        tab({ id: 2, url: 'https://example.com/a' }),
        tab({ id: 3, url: 'https://example.com/b' }),
        tab({ id: 4, url: 'https://example.com/b' }),
      ],
      exactSettings,
    );
    expect(groups).toHaveLength(2);
  });

  it('ignores missing and restricted URLs', () => {
    const groups = detectDuplicateGroups(
      [
        tab({ id: 1, url: undefined, title: 'Empty' }),
        tab({ id: 2, url: 'chrome://settings' }),
        tab({ id: 3, url: 'https://example.com/ok' }),
      ],
      exactSettings,
    );
    expect(groups).toHaveLength(0);
  });

  it('does not group distinct product identifiers', () => {
    const groups = detectDuplicateGroups(
      [
        tab({ id: 1, url: 'https://shop.example.com/p/1' }),
        tab({ id: 2, url: 'https://shop.example.com/p/2' }),
      ],
      exactSettings,
    );
    expect(groups).toHaveLength(0);
  });

  it('uses smart matching to ignore tracking parameters', () => {
    const groups = detectDuplicateGroups(
      [
        tab({ id: 1, url: 'https://example.com/item?id=9&utm_source=x' }),
        tab({ id: 2, url: 'https://example.com/item?id=9' }),
      ],
      smartSettings,
    );
    expect(groups).toHaveLength(1);
    expect(detectDuplicateGroups(
      [
        tab({ id: 1, url: 'https://example.com/item?id=9&utm_source=x' }),
        tab({ id: 2, url: 'https://example.com/item?id=9' }),
      ],
      exactSettings,
    )).toHaveLength(0);
  });

  it('returns no groups for an empty inventory', () => {
    expect(detectDuplicateGroups([], exactSettings)).toEqual([]);
  });
});
