import type {
  AppSettings,
  CleanupSkip,
  CleanupTarget,
  DuplicateGroup,
  InventoryTab,
  SkipReason,
  TabId,
} from '../types';

export interface CleanupPlan {
  targets: CleanupTarget[];
  skipped: CleanupSkip[];
  keepTabIds: TabId[];
}

export interface ProtectionContext {
  tabCountsByWindow: Map<number, number>;
}

function skip(tabId: TabId, reason: SkipReason, detail?: string): CleanupSkip {
  return detail ? { tabId, reason, detail } : { tabId, reason };
}

export function isEligibleForCleanup(
  tab: InventoryTab,
  group: DuplicateGroup,
  settings: Pick<AppSettings, 'protectPinned' | 'protectActive' | 'protectLastTabInWindow'>,
  selectedTabIds: Set<TabId>,
  context: ProtectionContext,
): CleanupSkip | null {
  if (tab.id === group.keepTabId) {
    return skip(tab.id, 'keep-tab');
  }
  if (!selectedTabIds.has(tab.id)) {
    return skip(tab.id, 'not-selected');
  }
  if (!tab.url || tab.restricted) {
    return skip(tab.id, 'restricted');
  }
  if (settings.protectPinned && tab.pinned) {
    return skip(tab.id, 'protected-pinned');
  }
  if (settings.protectActive && tab.active) {
    return skip(tab.id, 'protected-active');
  }
  if (settings.protectLastTabInWindow) {
    const count = context.tabCountsByWindow.get(tab.windowId) ?? 0;
    if (count <= 1) {
      return skip(tab.id, 'protected-last-in-window', 'Closing this tab would close the window.');
    }
  }
  return null;
}

export function planCleanup(
  groups: DuplicateGroup[],
  selectedTabIds: Iterable<TabId>,
  settings: Pick<AppSettings, 'protectPinned' | 'protectActive' | 'protectLastTabInWindow'>,
  allTabs: InventoryTab[],
): CleanupPlan {
  const selected = new Set(selectedTabIds);
  const context: ProtectionContext = {
    tabCountsByWindow: new Map(),
  };
  for (const tab of allTabs) {
    context.tabCountsByWindow.set(tab.windowId, (context.tabCountsByWindow.get(tab.windowId) ?? 0) + 1);
  }

  const targets: CleanupTarget[] = [];
  const skipped: CleanupSkip[] = [];
  const keepTabIds: TabId[] = [];
  const plannedClosuresByWindow = new Map<number, number>();

  for (const group of groups) {
    keepTabIds.push(group.keepTabId);
    for (const tab of group.members) {
      const rejection = isEligibleForCleanup(tab, group, settings, selected, {
        tabCountsByWindow: new Map(
          [...context.tabCountsByWindow.entries()].map(([windowId, count]) => [
            windowId,
            count - (plannedClosuresByWindow.get(windowId) ?? 0),
          ]),
        ),
      });
      if (rejection) {
        skipped.push(rejection);
        continue;
      }
      targets.push({
        tabId: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        title: tab.title,
        comparisonKey: group.comparisonKey,
        groupId: group.id,
      });
      plannedClosuresByWindow.set(tab.windowId, (plannedClosuresByWindow.get(tab.windowId) ?? 0) + 1);
    }
  }

  return { targets, skipped, keepTabIds };
}

export function eligibleTabIds(
  groups: DuplicateGroup[],
  settings: Pick<AppSettings, 'protectPinned' | 'protectActive' | 'protectLastTabInWindow'>,
  allTabs: InventoryTab[],
): TabId[] {
  const selected = new Set(groups.flatMap((group) => group.members.map((tab) => tab.id)));
  return planCleanup(groups, selected, settings, allTabs).targets.map((target) => target.tabId);
}
