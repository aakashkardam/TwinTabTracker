import type { SkipReason } from './types';

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  'keep-tab': 'Kept as the remaining copy',
  'not-selected': 'Not selected',
  'protected-pinned': 'Pinned tabs are protected',
  'protected-active': 'The active tab is protected',
  'protected-last-in-window': 'Last tab in its window',
  missing: 'The tab is no longer open',
  navigated: 'The page changed since preview',
  restricted: 'Restricted browser page',
  'already-closed': 'Already closed',
  'invalid-url': 'The tab has no usable URL',
};

export const SUGGESTED_COLLECTION_NAMES = ['Work', 'Research', 'Shopping', 'Learning', 'Weekend reading'];

export const KEYBOARD_SHORTCUTS = [
  { keys: 'Alt+Shift+D', action: 'Open the toolbar popup' },
  { keys: 'Alt+Shift+T', action: 'Open the dashboard' },
  { keys: 'Alt+Shift+P', action: 'Park the current tab' },
] as const;

export const STALE_TABS_COPY =
  'TwinTabTracker cannot see whether a site logged you out. These tabs look unused because the browser put them to sleep, unloaded them, or they have not been used in about a week.';

export const TOUR_STEPS = [
  {
    title: 'Find extra copies',
    body: 'Tabs that share the same URL appear as a group. Cleanup closes extras and keeps one copy.',
  },
  {
    title: 'Park a tab',
    body: 'Park this tab saves the URL and closes it. You can also right-click a browser tab or press Alt+Shift+P.',
  },
  {
    title: 'Open parked tabs',
    body: 'Click a parked row to open it again. Parking is not a bookmark — the tab leaves your strip until you restore it.',
  },
  {
    title: 'Search instead of opening again',
    body: 'Type a title or site to switch to a tab that is already open.',
  },
] as const;
