# Product spec

## Scope

TwinTabTracker helps people find open tabs, notice extra copies of the same URL, close those extras safely, and park pages they want later. The first useful version is local-only.

## User workflows

1. Open the popup, see counts, search, or clean eligible duplicates.
2. Open the dashboard for grouped review, filters, settings, and parked collections.
3. Switch to an existing tab instead of creating another copy.
4. Park selected tabs into a named collection and restore them later.
5. Change matching and protection rules in Settings.

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

Local saved URLs with collections, search, restore, rename, and delete. Restoring a URL does not guarantee the live page is unchanged.

## Acceptance criteria

See the master implementation prompt section 26. Automated coverage lives in `src/**/*.test.ts(x)`. Real-browser verification is recorded in `docs/TESTING.md` and is marked unverified when it was not executed.

## Non-goals

- User accounts, billing, ads, telemetry, or AI summarization
- Reading page content or injecting scripts into websites
- Claiming precise memory savings
- Universal interception of every tab-opening mechanism
- Treating all same-domain tabs as duplicates
- Safari distribution in this milestone
