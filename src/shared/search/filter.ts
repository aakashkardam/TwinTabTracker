import type { InventoryTab, SearchResult } from '../types';
import { hostnameFromUrl } from '../url/hostname';

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function scoreMatch(haystack: string, needle: string, field: SearchResult['matchField']): number | null {
  const index = haystack.indexOf(needle);
  if (index < 0) {
    return null;
  }
  const fieldBoost = field === 'title' ? 300 : field === 'hostname' ? 200 : 100;
  const prefixBoost = index === 0 ? 80 : 0;
  return fieldBoost + prefixBoost - index;
}

export function searchTabs(tabs: InventoryTab[], query: string): SearchResult[] {
  const needle = normalizeQuery(query);
  if (!needle) {
    return tabs.map((tab) => ({ tab, score: 0, matchField: 'title' as const }));
  }

  const results: SearchResult[] = [];
  for (const tab of tabs) {
    const title = (tab.title ?? '').toLowerCase();
    const url = (tab.url ?? '').toLowerCase();
    const hostname = hostnameFromUrl(tab.url);

    const titleScore = title ? scoreMatch(title, needle, 'title') : null;
    const hostScore = hostname ? scoreMatch(hostname, needle, 'hostname') : null;
    const urlScore = url ? scoreMatch(url, needle, 'url') : null;
    const best = [titleScore, hostScore, urlScore].filter((value): value is number => value != null);
    if (best.length === 0) {
      continue;
    }
    const score = Math.max(...best);
    const matchField =
      titleScore === score ? 'title' : hostScore === score ? 'hostname' : 'url';
    results.push({ tab, score, matchField });
  }

  results.sort((a, b) => b.score - a.score || (a.tab.title ?? '').localeCompare(b.tab.title ?? ''));
  return results;
}
