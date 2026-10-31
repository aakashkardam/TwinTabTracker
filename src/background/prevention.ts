import { getBrowserAdapter } from '../shared/browser/adapter';
import type { RawBrowserTab } from '../shared/browser/types';
import { detectDuplicateGroups } from '../shared/duplicates/detect';
import { loadInventory } from '../shared/inventory/service';
import { log } from '../shared/log';
import { createStorageClient } from '../shared/storage/client';
import { comparisonKey, normalizeOptionsFromSettings } from '../shared/url/normalize';
import { mapBrowserTab } from '../shared/tabs/map';

const recentNotices = new Map<string, number>();
const NOTICE_COOLDOWN_MS = 30_000;

export async function handlePotentialDuplicate(raw: RawBrowserTab): Promise<void> {
  if (raw.id == null || !raw.url) {
    return;
  }
  const adapter = getBrowserAdapter();
  const storage = createStorageClient(adapter);
  const state = await storage.read();
  if (state.settings.duplicateNotice === 'off') {
    return;
  }

  const snapshot = await loadInventory(adapter);
  const groups = detectDuplicateGroups(snapshot.tabs, state.settings);
  const tab = mapBrowserTab(raw);
  const key = comparisonKey(tab.url, normalizeOptionsFromSettings(state.settings));
  const group = groups.find((item) => item.comparisonKey === key);
  if (!group || group.copyCount < 2) {
    return;
  }
  const existing = group.members.find((member) => member.id !== tab.id);
  if (!existing) {
    return;
  }

  const last = recentNotices.get(key) ?? 0;
  if (Date.now() - last < NOTICE_COOLDOWN_MS) {
    return;
  }
  const now = Date.now();
  recentNotices.set(key, now);
  for (const [seenKey, seenAt] of recentNotices) {
    if (now - seenAt > NOTICE_COOLDOWN_MS || recentNotices.size > 200) {
      recentNotices.delete(seenKey);
    }
  }

  try {
    await storage.update((current) => ({
      ...current,
      lastDuplicateNotice: {
        createdAt: Date.now(),
        newTabId: tab.id,
        existingTabId: existing.id,
        url: tab.url ?? existing.url ?? '',
        title: tab.title ?? existing.title,
      },
    }));
  } catch (error) {
    log.warn('Could not persist duplicate notice.', error);
  }
}
