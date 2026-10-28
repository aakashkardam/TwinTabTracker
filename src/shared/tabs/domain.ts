import type { InventoryTab } from '../types';
import { displayHost, hostnameFromUrl } from '../url/hostname';

export interface DomainGroup {
  domain: string;
  label: string;
  tabs: InventoryTab[];
}

export function groupTabsByDomain(tabs: InventoryTab[]): DomainGroup[] {
  const buckets = new Map<string, InventoryTab[]>();
  for (const tab of tabs) {
    const domain = hostnameFromUrl(tab.url) || (tab.restricted ? 'restricted' : 'unknown');
    const existing = buckets.get(domain);
    if (existing) {
      existing.push(tab);
    } else {
      buckets.set(domain, [tab]);
    }
  }

  return [...buckets.entries()]
    .map(([domain, grouped]) => ({
      domain,
      label: domain === 'restricted' ? 'Restricted pages' : domain === 'unknown' ? 'Unknown' : displayHost(grouped[0]?.url),
      tabs: grouped,
    }))
    .sort((a, b) => b.tabs.length - a.tabs.length || a.label.localeCompare(b.label));
}
