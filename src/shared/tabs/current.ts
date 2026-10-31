import type { InventoryTab, InventoryWindow } from '../types';

export function findCurrentTab(tabs: InventoryTab[], windows: InventoryWindow[]): InventoryTab | undefined {
  const focused = windows.find((window) => window.focused);
  if (focused) {
    const active = tabs.find((tab) => tab.windowId === focused.id && tab.active);
    if (active) {
      return active;
    }
  }
  return tabs.find((tab) => tab.active);
}

export function canParkTab(tab: InventoryTab | undefined): tab is InventoryTab {
  return Boolean(tab?.url && !tab.restricted);
}
