import { getBrowserAdapter } from '../shared/browser/adapter';
import type { RawBrowserTab } from '../shared/browser/types';
import { executeCleanup } from '../shared/cleanup/execute';
import { undoCleanup, type UndoResult } from '../shared/cleanup/undo';
import { planCleanup } from '../shared/duplicates/plan';
import { loadInventory } from '../shared/inventory/service';
import { INBOX_COLLECTION_ID, deleteParkedEntries, parkTabs } from '../shared/park/operations';
import { createStorageClient } from '../shared/storage/client';
import { mapBrowserTab } from '../shared/tabs/map';
import type {
  AppSettings,
  CleanupOperation,
  DuplicateGroup,
  InventoryTab,
  ParkedEntry,
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

export interface ParkResult {
  parked: number;
  closed: number;
}

function closableParkedIds(tabs: InventoryTab[], liveTabs: InventoryTab[]): number[] {
  const windowCounts = new Map<number, number>();
  for (const tab of liveTabs) {
    windowCounts.set(tab.windowId, (windowCounts.get(tab.windowId) ?? 0) + 1);
  }
  const closable: number[] = [];
  for (const tab of tabs) {
    const live = liveTabs.find((item) => item.id === tab.id);
    if (!live || live.restricted || live.pinned || !live.url) {
      continue;
    }
    const remaining = windowCounts.get(live.windowId) ?? 0;
    if (remaining <= 1) {
      continue;
    }
    closable.push(live.id);
    windowCounts.set(live.windowId, remaining - 1);
  }
  return closable;
}

export async function parkAndClose(
  tabs: InventoryTab[],
  collectionId = INBOX_COLLECTION_ID,
  closeAfter = true,
): Promise<ParkResult> {
  const adapter = getBrowserAdapter();
  const parkable = tabs.filter((tab) => tab.url && !tab.restricted);
  if (parkable.length === 0) {
    return { parked: 0, closed: 0 };
  }
  const storage = createStorageClient(adapter);
  await storage.update((current) => parkTabs(current, parkable, collectionId));
  if (!closeAfter) {
    return { parked: parkable.length, closed: 0 };
  }
  const live = await loadInventory(adapter);
  const ids = closableParkedIds(parkable, live.tabs);
  if (ids.length > 0) {
    await adapter.removeTabs(ids);
  }
  return { parked: parkable.length, closed: ids.length };
}

export async function parkSelected(
  _state: PersistedState,
  tabs: InventoryTab[],
  collectionId: string,
  closeAfter: boolean,
): Promise<PersistedState> {
  await parkAndClose(tabs, collectionId, closeAfter);
  return createStorageClient().read();
}

export async function parkRawTabs(rawTabs: RawBrowserTab[], collectionId = INBOX_COLLECTION_ID): Promise<ParkResult> {
  return parkAndClose(rawTabs.map((raw) => mapBrowserTab(raw)), collectionId, true);
}

export async function restoreParked(urls: string[], activateFirst = false): Promise<void> {
  const adapter = getBrowserAdapter();
  for (const [index, url] of urls.entries()) {
    await adapter.createTab({ url, active: activateFirst && index === 0 });
  }
}

export async function restoreParkedEntries(entries: ParkedEntry[], deleteAfter: boolean): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  await restoreParked(
    entries.map((entry) => entry.url),
    true,
  );
  if (deleteAfter) {
    const storage = createStorageClient();
    await storage.update((state) => deleteParkedEntries(state, entries.map((entry) => entry.id)));
  }
}

export async function dismissNotice(): Promise<void> {
  const storage = createStorageClient();
  await storage.update((state) => ({ ...state, lastDuplicateNotice: null }));
}
