import type { InventoryTab, StaleReason } from '../types';

export const STALE_IDLE_MS = 7 * 24 * 60 * 60 * 1000;

export interface StaleTabCandidate {
  tab: InventoryTab;
  reasons: StaleReason[];
}

export function staleReasons(tab: InventoryTab, now = Date.now(), idleMs = STALE_IDLE_MS): StaleReason[] {
  if (!tab.url || tab.restricted || tab.pinned || tab.active) {
    return [];
  }
  const reasons: StaleReason[] = [];
  if (tab.discarded) {
    reasons.push('discarded');
  }
  if (tab.status === 'unloaded') {
    reasons.push('unloaded');
  }
  if (tab.lastAccessed != null && now - tab.lastAccessed >= idleMs) {
    reasons.push('inactive');
  }
  return reasons;
}

export function findStaleTabs(
  tabs: InventoryTab[],
  now = Date.now(),
  idleMs = STALE_IDLE_MS,
): StaleTabCandidate[] {
  return tabs.flatMap((tab) => {
    const reasons = staleReasons(tab, now, idleMs);
    return reasons.length > 0 ? [{ tab, reasons }] : [];
  });
}

export function staleReasonLabel(reason: StaleReason): string {
  switch (reason) {
    case 'discarded':
      return 'Sleeping';
    case 'unloaded':
      return 'Unloaded';
    case 'inactive':
      return 'Unused recently';
  }
}
