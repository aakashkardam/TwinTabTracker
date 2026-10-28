import type {
  AppSettings,
  DuplicateGroup,
  DuplicateWarning,
  InventoryTab,
  WindowId,
} from '../types';
import { comparisonKey, normalizeOptionsFromSettings } from '../url/normalize';
import { selectKeepTab } from './keep';

function hashKey(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function warningsFor(members: InventoryTab[], keepTabId: number): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = [];
  if (members.some((tab) => tab.pinned)) {
    warnings.push('pinned-member');
  }
  if (members.some((tab) => tab.active)) {
    warnings.push('active-member');
  }
  if (members.some((tab) => tab.restricted || !tab.url)) {
    warnings.push('restricted-member');
  }
  const windowIds = new Set(members.map((tab) => tab.windowId));
  if (windowIds.size > 1) {
    warnings.push('cross-window');
  }
  const protectedCount = members.filter(
    (tab) => tab.id === keepTabId || tab.pinned || tab.active || tab.restricted || !tab.url,
  ).length;
  if (protectedCount >= members.length) {
    warnings.push('all-protected');
  }
  return warnings;
}

export function detectDuplicateGroups(
  tabs: InventoryTab[],
  settings: Pick<
    AppSettings,
    'matchMode' | 'stripTrackingParams' | 'extraTrackingParams' | 'ignoreFragmentInSmartMode'
  >,
  focusedWindowId: WindowId | null = null,
): DuplicateGroup[] {
  const options = normalizeOptionsFromSettings(settings);
  const buckets = new Map<string, InventoryTab[]>();

  for (const tab of tabs) {
    if (!tab.url || tab.restricted) {
      continue;
    }
    const key = comparisonKey(tab.url, options);
    if (key.startsWith('missing:') || key.startsWith('restricted:') || key.startsWith('raw:')) {
      continue;
    }
    const existing = buckets.get(key);
    if (existing) {
      existing.push(tab);
    } else {
      buckets.set(key, [tab]);
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, members] of buckets) {
    if (members.length < 2) {
      continue;
    }
    const keepTabId = selectKeepTab(members, focusedWindowId);
    groups.push({
      id: `dup-${hashKey(key)}`,
      comparisonKey: key,
      members: [...members].sort((a, b) => {
        if (a.windowId !== b.windowId) {
          return a.windowId - b.windowId;
        }
        return a.index - b.index;
      }),
      copyCount: members.length,
      extraCount: members.length - 1,
      keepTabId,
      warnings: warningsFor(members, keepTabId),
    });
  }

  groups.sort((a, b) => b.copyCount - a.copyCount || a.comparisonKey.localeCompare(b.comparisonKey));
  return groups;
}

export function duplicateCounts(groups: DuplicateGroup[]): {
  duplicateTabs: number;
  extraTabs: number;
  groupCount: number;
} {
  return {
    duplicateTabs: groups.reduce((sum, group) => sum + group.copyCount, 0),
    extraTabs: groups.reduce((sum, group) => sum + group.extraCount, 0),
    groupCount: groups.length,
  };
}
