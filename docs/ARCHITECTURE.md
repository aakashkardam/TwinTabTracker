# Architecture

## Module responsibilities

- `src/manifest.ts` — browser-specific Manifest V3 generation.
- `src/shared/browser/` — typed WebExtensions adapter. UI and background code talk to this layer, not to `chrome.*` directly.
- `src/shared/url/` — restricted-URL detection and canonical comparison keys.
- `src/shared/duplicates/` — pure duplicate grouping, keep-tab policy, and cleanup planning.
- `src/shared/cleanup/` — revalidated close operations and undo.
- `src/shared/inventory/` — snapshot loading and incremental tab-event updates.
- `src/shared/search/` — in-memory title/host/URL filtering.
- `src/shared/park/` — parked entries and collections.
- `src/shared/storage/` — versioned local storage and migrations.
- `src/background/` — service worker: badge counts, duplicate notices, park command, tab context menu.
- `src/popup/` — compact popup UI.
- `src/dashboard/` — full-page UI.

Core algorithms are pure functions and are unit-tested without a browser.

## Browser compatibility

The adapter uses `globalThis.browser` when present and otherwise `chrome`. Chrome MV3 uses a module service worker. Firefox MV3 uses `background.scripts` plus a `gecko` extension ID.

Safari requires a separate Xcode Web Extension wrapper, signing, and entitlements. That packaging is not implemented.

## Data flow

1. Popup or dashboard calls `loadInventory()` through the adapter.
2. Tab/window events update the in-memory inventory; unknown events trigger a full refresh.
3. `detectDuplicateGroups()` derives groups from the snapshot and current settings.
4. Cleanup planning is derived from groups, the user's selection, and protection settings.
5. `executeCleanup()` re-reads each target tab, skips stale or protected tabs, then closes the remainder.
6. Results are stored in `storage.local` under `twintabtracker.state`.

Duplicate detection never mutates browser state.

## Background worker lifecycle

The worker is event-driven and assumed to be short-lived. It:

- refreshes the action badge after tab changes
- records an optional duplicate-awareness notice
- opens the dashboard from the `open-dashboard` command
- parks the current tab from `park-current-tab` or the **Park this tab** context menu

It does not keep the tab inventory as the source of truth. Popup and dashboard rebuild state from browser APIs. Persistent user data lives in `storage.local`.

## Storage

Schema version `1` contains settings, parked entries, collections, cleanup history, and the latest duplicate notice. `migratePersistedState()` accepts missing, corrupt, or future-unknown records and returns a usable default state. Cleanup history is truncated to `settings.cleanupHistoryLimit`. `StorageClient.update()` serializes writes with the Web Locks API when available, otherwise an in-process queue.

Browser tab IDs are never treated as durable identifiers for parked entries.

## Design decisions

- Manifest V3, not the original MV2 stub, because MV2 is retired in Chromium.
- No `webextension-polyfill` dependency; the adapter is small and explicit.
- No content scripts or host permissions; tab metadata is enough for the product.
- React is used only for UI. Browser events stay outside React.
- Smart matching is opt-in. Exact matching is the default.
- Duplicate prevention never auto-closes tabs.
- Native tab groups are displayed as metadata when `groupId` exists; the extension does not move tabs between native groups.
