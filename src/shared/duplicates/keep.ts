import type { InventoryTab, TabId, WindowId } from '../types';

function byWindowThenIndex(a: InventoryTab, b: InventoryTab): number {
  if (a.windowId !== b.windowId) {
    return a.windowId - b.windowId;
  }
  return a.index - b.index;
}

export function selectKeepTab(
  members: InventoryTab[],
  focusedWindowId: WindowId | null = null,
): TabId {
  if (members.length === 0) {
    throw new Error('Cannot select a keep tab from an empty group.');
  }

  const usable = members.filter((tab) => tab.id >= 0);
  const pool = usable.length > 0 ? usable : members;

  const active = pool.filter((tab) => tab.active).sort(byWindowThenIndex);
  if (active.length > 0) {
    const inFocused = focusedWindowId == null ? undefined : active.find((tab) => tab.windowId === focusedWindowId);
    return (inFocused ?? active[0])!.id;
  }

  const pinned = pool.filter((tab) => tab.pinned).sort(byWindowThenIndex);
  if (pinned.length > 0) {
    return pinned[0]!.id;
  }

  if (focusedWindowId != null) {
    const inFocused = pool.filter((tab) => tab.windowId === focusedWindowId).sort(byWindowThenIndex);
    if (inFocused.length > 0) {
      return inFocused[0]!.id;
    }
  }

  return [...pool].sort(byWindowThenIndex)[0]!.id;
}
