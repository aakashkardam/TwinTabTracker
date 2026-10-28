import { getBrowserAdapter } from '../shared/browser/adapter';
import { executeCleanup } from '../shared/cleanup/execute';
import { undoCleanup, type UndoResult } from '../shared/cleanup/undo';
import { planCleanup } from '../shared/duplicates/plan';
import { loadInventory } from '../shared/inventory/service';
import { parkTabs } from '../shared/park/operations';
import { createStorageClient } from '../shared/storage/client';
import type {
  AppSettings,
  CleanupOperation,
  DuplicateGroup,
  InventoryTab,
  PersistedState,
  TabId,
} from '../shared/types';

export async function activateTab(tab: InventoryTab): Promise<void> {
  await getBrowserAdapter().activateTab(tab.id, tab.windowId);
}

export async function openDashboard(hash?: string): Promise<void> {
  await getBrowserAdapter().openDashboard(hash);
}

export async function runCleanup(args: {
  groups: DuplicateGroup[];
  selectedTabIds: Iterable<TabId>;
  settings: AppSettings;
  tabs: InventoryTab[];
}): Promise<CleanupOperation> {
  const adapter = getBrowserAdapter();
  const live = await loadInventory(adapter);
  const plan = planCleanup(args.groups, args.selectedTabIds, args.settings, live.tabs);
  const result = await executeCleanup(adapter, {
    targets: plan.targets,
    keepTabIds: plan.keepTabIds,
    settings: args.settings,
    allTabs: live.tabs,
  });
  const storage = createStorageClient(adapter);
  await storage.pushCleanup(result, args.settings.cleanupHistoryLimit);
  return result;
}

export async function undoLastCleanup(state: PersistedState): Promise<UndoResult> {
  const operation = state.cleanupHistory[0];
  if (!operation) {
    return { restored: 0, failed: 0, method: 'none', messages: ['No cleanup to undo.'] };
  }
  return undoCleanup(getBrowserAdapter(), operation);
}

export async function parkSelected(
  _state: PersistedState,
  tabs: InventoryTab[],
  collectionId: string,
  closeAfter: boolean,
): Promise<PersistedState> {
  const adapter = getBrowserAdapter();
  const storage = createStorageClient(adapter);
  const next = await storage.update((current) => parkTabs(current, tabs, collectionId));
  if (closeAfter) {
    const ids = tabs.filter((tab) => tab.url && !tab.restricted && !tab.pinned && !tab.active).map((tab) => tab.id);
    if (ids.length > 0) {
      await adapter.removeTabs(ids);
    }
  }
  return next;
}

export async function restoreParked(urls: string[]): Promise<void> {
  const adapter = getBrowserAdapter();
  for (const url of urls) {
    await adapter.createTab({ url, active: false });
  }
}

export async function dismissNotice(): Promise<void> {
  const storage = createStorageClient();
  await storage.update((state) => ({ ...state, lastDuplicateNotice: null }));
}
