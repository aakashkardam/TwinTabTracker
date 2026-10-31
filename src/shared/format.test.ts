import { describe, expect, it } from 'vitest';
import { listLabels, reopenedMessage, undoWillReopen } from './format';

describe('closed-tab copy', () => {
  it('summarizes titles for undo and restore', () => {
    const closed = [
      { title: 'Docs', url: 'https://example.com/docs' },
      { title: 'Notes', url: 'https://example.com/notes' },
    ];
    expect(listLabels(['Docs', 'Notes'])).toBe('Docs and Notes');
    expect(undoWillReopen(closed)).toBe('Undo will reopen Docs and Notes.');
    expect(reopenedMessage(1, [closed[0]!])).toBe('Reopened 1 tab: Docs.');
    expect(reopenedMessage(2, closed)).toBe('Reopened 2 tabs: Docs and Notes.');
  });
});
