import type { BrowserAdapter } from '../browser/types';
import type { CleanupOperation } from '../types';

export interface UndoResult {
  restored: number;
  failed: number;
  method: 'session' | 'reopen-url' | 'none';
  messages: string[];
}

export async function undoCleanup(
  adapter: BrowserAdapter,
  operation: CleanupOperation,
): Promise<UndoResult> {
  if (operation.closed.length === 0) {
    return { restored: 0, failed: 0, method: 'none', messages: ['There is nothing to restore.'] };
  }

  const messages: string[] = [];
  let restored = 0;
  let failed = 0;
  let usedSession = false;
  let usedReopen = false;

  for (const record of [...operation.closed].reverse()) {
    if (record.sessionId) {
      try {
        await adapter.restoreSession(record.sessionId);
        restored += 1;
        usedSession = true;
        continue;
      } catch {
        messages.push('Session restore was unavailable for at least one tab.');
      }
    }
    if (!record.url) {
      failed += 1;
      messages.push('A closed tab had no URL and could not be reopened.');
      continue;
    }
    try {
      await adapter.createTab({
        url: record.url,
        windowId: record.windowId >= 0 ? record.windowId : undefined,
        index: record.index,
        pinned: record.pinned,
        active: false,
      });
      restored += 1;
      usedReopen = true;
    } catch {
      try {
        await adapter.createTab({ url: record.url, active: false });
        restored += 1;
        usedReopen = true;
      } catch (error) {
        failed += 1;
        messages.push(error instanceof Error ? error.message : 'A tab could not be reopened.');
      }
    }
  }

  if (usedReopen) {
    messages.push(
      'Some tabs were reopened by URL. Form data, scroll position, and page state are not restored.',
    );
  }

  return {
    restored,
    failed,
    method: usedSession && !usedReopen ? 'session' : usedReopen ? 'reopen-url' : 'none',
    messages: [...new Set(messages)],
  };
}
