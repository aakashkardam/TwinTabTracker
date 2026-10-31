# Product spec

## Scope

TwinTabTracker helps people find open tabs, notice extra copies of the same URL, close those extras safely, and park pages they want later. The first useful version is local-only.

## User workflows

1. Open the popup, see counts, search, park the current tab, or clean eligible duplicates.
2. Click a parked tab in the popup to open it again.
3. Open the dashboard for grouped review, filters, unused-tab insights, settings, and parked collections.
4. Switch to an existing tab instead of creating another copy.
5. Park a tab from the popup, All tabs, the tab context menu, or `Alt+Shift+P`.
6. Change matching and protection rules in Settings.

## Feature definitions

### Tab inventory

Load current tabs and windows. Update from browser events. Mark restricted/missing URLs instead of crashing.

### Duplicate detection

Group tabs by canonical URL. Default exact mode. Optional smart mode that drops documented tracking parameters.

Keep-tab policy: active tab, else pinned tab, else tab in the focused window, else lowest window/index.

### Safe cleanup

Preview targets. Preserve one tab per group. Protect pinned, active, and last-in-window tabs by default. Revalidate before close. Report skips and failures. Offer undo through sessions or URL reopen.

### Search

Case-insensitive match on title, hostname, and URL. Activate the selected existing tab.

### Duplicate awareness

Optional. When a newly completed navigation matches an open tab, show a popup banner with a switch action. No automatic close. Repeated notices for the same comparison key are rate-limited.

### Parked tabs

Parking saves a URL locally and closes the live tab when it is safe to do so. It is not a bookmark: the tab leaves the strip. Click a parked row to open the URL. Collections, search, rename, delete, and JSON export/import are available in the dashboard. Restoring a URL does not recover page state.

### Unused-tab insights

Surface discarded, unloaded, or long-idle tabs as optional park candidates. Do not claim login or session-timeout detection. Do not auto-close these tabs.

## Acceptance criteria

See the master implementation prompt section 26. Automated coverage lives in `src/**/*.test.ts(x)`. Real-browser verification is recorded in `docs/TESTING.md` and is marked unverified when it was not executed.

## Non-goals

- User accounts, billing, ads, telemetry, or AI summarization
- Reading page content or injecting scripts into websites
- Claiming precise memory savings
- Universal interception of every tab-opening mechanism
- Treating all same-domain tabs as duplicates
- Safari distribution in this milestone
