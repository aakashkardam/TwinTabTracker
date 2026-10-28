# Roadmap

## Completed

- Repository assessment of the MV2 stub
- TypeScript + Vite + React + Vitest + ESLint foundation
- Chromium MV3 and Firefox MV3 packaging
- Tab inventory, exact/smart duplicate matching, popup, dashboard
- Safe cleanup, revalidation, history, undo
- Search and tab activation
- Parked tabs, collections, settings, themes
- Duplicate-awareness banner (no auto-close)
- Domain grouping in the All tabs view
- Automated unit/component tests and documentation

## Current milestone

Pre-launch dogfood of the unpacked Chrome build. Collect issues from daily use, then verify Firefox and prepare store listing assets.

## Remaining tasks

- Continue daily use in branded Chrome and record friction around cleanup, undo, search, and permissions
- Firefox real-browser verification (`dist/firefox`)
- Store listing copy, screenshots, and a versioned release checklist
- Safari Web Extension Xcode wrapper, signing, and entitlements
- Native tab-group actions where `tabGroups` is available
- Inactive-tab insights based only on observed activation after install
- Keyboard shortcut customization UI beyond the manifest commands

## Known limitations

- Safari is not packaged
- Duplicate awareness cannot see every tab-creation path
- URL reopen undo cannot restore page state
- Last-tab-in-window protection can prevent cleanup of a duplicate that is the only tab in its window

## Recommended next steps

1. `npm install && npm test && npm run typecheck && npm run lint && npm run build:chrome`
2. Load `dist/chrome` in Chrome and run the manual checklist in `docs/TESTING.md`
3. If Chrome looks good, produce `dist/firefox` and test in Firefox
4. Only then evaluate Safari packaging
