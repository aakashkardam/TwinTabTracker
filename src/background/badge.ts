import { getBrowserAdapter } from '../shared/browser/adapter';
import { detectDuplicateGroups, duplicateCounts } from '../shared/duplicates/detect';
import { loadInventory } from '../shared/inventory/service';
import { createStorageClient } from '../shared/storage/client';

export async function refreshBadge(): Promise<void> {
  const adapter = getBrowserAdapter();
  const storage = createStorageClient(adapter);
  try {
    const [snapshot, state] = await Promise.all([loadInventory(adapter), storage.read()]);
    const groups = detectDuplicateGroups(snapshot.tabs, state.settings);
    const { extraTabs } = duplicateCounts(groups);
    const text = extraTabs > 0 ? (extraTabs > 99 ? '99+' : String(extraTabs)) : '';
    await adapter.setBadge(text);
  } catch {
    await adapter.setBadge('');
  }
}
