import { describe, expect, it } from 'vitest';
import { tab } from '../../test/fixtures';
import { canParkTab, findCurrentTab } from './current';

describe('current tab', () => {
  it('prefers the active tab in the focused window', () => {
    const tabs = [
      tab({ id: 1, windowId: 1, active: true }),
      tab({ id: 2, windowId: 2, active: true }),
    ];
    const current = findCurrentTab(tabs, [
      { id: 1, focused: false, incognito: false, type: 'normal', tabCount: 1, title: 'A' },
      { id: 2, focused: true, incognito: false, type: 'normal', tabCount: 1, title: 'B' },
    ]);
    expect(current?.id).toBe(2);
  });

  it('rejects restricted tabs for parking', () => {
    expect(canParkTab(tab({ url: 'chrome://extensions' }))).toBe(false);
    expect(canParkTab(tab({ url: 'https://example.com' }))).toBe(true);
  });
});
