import type { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  matchMode: 'exact',
  stripTrackingParams: true,
  extraTrackingParams: [],
  ignoreFragmentInSmartMode: true,
  protectPinned: true,
  protectActive: true,
  protectLastTabInWindow: true,
  duplicateNotice: 'banner',
  theme: 'system',
  cleanupHistoryLimit: 20,
  deleteParkedAfterRestore: false,
  defaultDashboardView: 'overview',
};

export function mergeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  const input = value as Partial<AppSettings>;
  const extra = Array.isArray(input.extraTrackingParams)
    ? input.extraTrackingParams.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : DEFAULT_SETTINGS.extraTrackingParams;
  const historyLimit =
    typeof input.cleanupHistoryLimit === 'number' && Number.isFinite(input.cleanupHistoryLimit)
      ? Math.min(50, Math.max(1, Math.round(input.cleanupHistoryLimit)))
      : DEFAULT_SETTINGS.cleanupHistoryLimit;

  return {
    matchMode: input.matchMode === 'smart' ? 'smart' : 'exact',
    stripTrackingParams:
      typeof input.stripTrackingParams === 'boolean'
        ? input.stripTrackingParams
        : DEFAULT_SETTINGS.stripTrackingParams,
    extraTrackingParams: extra,
    ignoreFragmentInSmartMode:
      typeof input.ignoreFragmentInSmartMode === 'boolean'
        ? input.ignoreFragmentInSmartMode
        : DEFAULT_SETTINGS.ignoreFragmentInSmartMode,
    protectPinned:
      typeof input.protectPinned === 'boolean' ? input.protectPinned : DEFAULT_SETTINGS.protectPinned,
    protectActive:
      typeof input.protectActive === 'boolean' ? input.protectActive : DEFAULT_SETTINGS.protectActive,
    protectLastTabInWindow:
      typeof input.protectLastTabInWindow === 'boolean'
        ? input.protectLastTabInWindow
        : DEFAULT_SETTINGS.protectLastTabInWindow,
    duplicateNotice:
      input.duplicateNotice === 'off' || input.duplicateNotice === 'badge' || input.duplicateNotice === 'banner'
        ? input.duplicateNotice
        : DEFAULT_SETTINGS.duplicateNotice,
    theme:
      input.theme === 'light' || input.theme === 'dark' || input.theme === 'system'
        ? input.theme
        : DEFAULT_SETTINGS.theme,
    cleanupHistoryLimit: historyLimit,
    deleteParkedAfterRestore:
      typeof input.deleteParkedAfterRestore === 'boolean'
        ? input.deleteParkedAfterRestore
        : DEFAULT_SETTINGS.deleteParkedAfterRestore,
    defaultDashboardView:
      input.defaultDashboardView === 'overview' ||
      input.defaultDashboardView === 'duplicates' ||
      input.defaultDashboardView === 'tabs' ||
      input.defaultDashboardView === 'parked' ||
      input.defaultDashboardView === 'collections' ||
      input.defaultDashboardView === 'settings'
        ? input.defaultDashboardView
        : DEFAULT_SETTINGS.defaultDashboardView,
  };
}
