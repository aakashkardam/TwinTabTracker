import type { DashboardView } from '../shared/types';

export const NAV: Array<{ id: DashboardView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'tabs', label: 'All tabs' },
  { id: 'parked', label: 'Parked tabs' },
  { id: 'collections', label: 'Collections' },
  { id: 'settings', label: 'Settings' },
];

export function viewFromHash(fallback: DashboardView): DashboardView {
  const hash = window.location.hash.replace('#', '') as DashboardView;
  return NAV.some((item) => item.id === hash) ? hash : fallback;
}
