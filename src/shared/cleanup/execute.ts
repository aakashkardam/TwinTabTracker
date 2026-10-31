import type { BrowserAdapter } from '../browser/types';
import { mapBrowserTab } from '../tabs/map';
import { comparisonKey, normalizeOptionsFromSettings } from '../url/normalize';
import { createId } from '../id';
import type {
  AppSettings,
  CleanupFailure,
  CleanupOperation,
  CleanupSkip,
  CleanupTarget,
  ClosedTabRecord,
  InventoryTab,
} from '../types';

export interface ExecuteCleanupInput {
  targets: CleanupTarget[];
  keepTabIds: number[];
  settings: AppSettings;
  allTabs: InventoryTab[];
}

function skip(tabId: number, reason: CleanupSkip['reason'], detail?: string): CleanupSkip {
  return detail ? { tabId, reason, detail } : { tabId, reason };
}

export async function executeCleanup(
  adapter: BrowserAdapter,
  input: ExecuteCleanupInput,
  now = Date.now(),
): Promise<CleanupOperation> {
  const startedAt = now;
  const options = normalizeOptionsFromSettings(input.settings);
  const skipped: CleanupSkip[] = [];
  const failures: CleanupFailure[] = [];
  const confirmed: CleanupTarget[] = [];
  const keep = new Set(input.keepTabIds);
  const windowCounts = new Map<number, number>();
  for (const tab of input.allTabs) {
    windowCounts.set(tab.windowId, (windowCounts.get(tab.windowId) ?? 0) + 1);
  }

  const inspected = await Promise.all(
    input.targets.map(async (target) => {
      if (keep.has(target.tabId)) {
        return { target, live: null as InventoryTab | null, earlySkip: skip(target.tabId, 'keep-tab') };
      }
      const raw = await adapter.getTab(target.tabId);
      if (!raw || raw.id == null) {
        return { target, live: null as InventoryTab | null, earlySkip: skip(target.tabId, 'missing') };
      }
      return { target, live: mapBrowserTab(raw, now), earlySkip: null as CleanupSkip | null };
    }),
  );

  for (const item of inspected) {
    if (item.earlySkip || !item.live) {
      skipped.push(item.earlySkip ?? skip(item.target.tabId, 'missing'));
      continue;
    }
    const live = item.live;
    if (!live.url || live.restricted) {
      skipped.push(skip(item.target.tabId, 'restricted'));
      continue;
    }
    if (item.target.url && comparisonKey(live.url, options) !== comparisonKey(item.target.url, options)) {
      skipped.push(skip(item.target.tabId, 'navigated', 'The tab changed since the preview.'));
      continue;
    }
    if (input.settings.protectPinned && live.pinned) {
      skipped.push(skip(item.target.tabId, 'protected-pinned'));
      continue;
    }
    if (input.settings.protectActive && live.active) {
      skipped.push(skip(item.target.tabId, 'protected-active'));
      continue;
    }
    if (input.settings.protectLastTabInWindow) {
      const remaining = windowCounts.get(live.windowId) ?? 0;
      if (remaining <= 1) {
        skipped.push(skip(item.target.tabId, 'protected-last-in-window'));
        continue;
      }
    }
    confirmed.push({
      ...item.target,
      url: live.url,
      title: live.title,
      windowId: live.windowId,
    });
    windowCounts.set(live.windowId, (windowCounts.get(live.windowId) ?? 1) - 1);
  }

  const closed: ClosedTabRecord[] = [];
  if (confirmed.length > 0) {
    const ids = confirmed.map((item) => item.tabId);
    try {
      await adapter.removeTabs(ids);
    } catch (error) {
      for (const target of confirmed) {
        failures.push({
          tabId: target.tabId,
          message: error instanceof Error ? error.message : 'The browser refused to close this tab.',
        });
      }
    }

    if (failures.length === 0) {
      for (const target of confirmed) {
        const stillThere = await adapter.getTab(target.tabId);
        if (stillThere?.id != null) {
          failures.push({
            tabId: target.tabId,
            message: 'The tab was still open after the close request.',
          });
          continue;
        }
        closed.push({
          tabId: target.tabId,
          windowId: target.windowId,
          index: input.allTabs.find((tab) => tab.id === target.tabId)?.index ?? 0,
          url: target.url,
          title: target.title,
          pinned: Boolean(input.allTabs.find((tab) => tab.id === target.tabId)?.pinned),
          sessionId: null,
        });
      }
    }
  }

  if (closed.length > 0) {
    try {
      const recent = await adapter.getRecentlyClosed(Math.min(25, closed.length + 5));
      for (const record of closed) {
        const match = recent.find((session) => session.tab?.url === record.url && session.tab?.sessionId);
        record.sessionId = match?.tab?.sessionId ?? null;
      }
    } catch {
      // Session lookup is optional.
    }
  }

  const restoreMethod =
    closed.some((item) => item.sessionId) ? 'session' : closed.some((item) => item.url) ? 'reopen-url' : 'none';

  return {
    id: createId('cleanup'),
    startedAt,
    completedAt: Date.now(),
    targets: input.targets,
    closed,
    skipped,
    failures,
    restoreAvailable: closed.length > 0 && restoreMethod !== 'none',
    restoreMethod,
  };
}
