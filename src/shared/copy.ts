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
