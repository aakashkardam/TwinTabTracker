# Agent notes for TwinTabTracker

This is a Manifest V3 browser extension. Do not reintroduce Manifest V2, content scripts, host permissions, analytics, accounts, or remote application code.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build:chrome
npm run build:firefox
npm run test:chrome   # requires Playwright Chromium / Chrome for Testing
```

Load `dist/chrome` or `dist/firefox`, never the repository root. The original root `manifest.json` was an MV2 stub and is not the shipping manifest.

## Architecture conventions

- Put browser I/O in `src/shared/browser`.
- Keep duplicate matching, cleanup planning, search, and parking as pure functions.
- Persist user data through `src/shared/storage` with schema migrations.
- Use React only in `src/popup` and `src/dashboard` (plus shared UI components).
- Settings must change real behavior. Do not add decorative controls.

## Safety rules

- Never close every tab in a duplicate group.
- Revalidate tabs before closing them.
- Default-protect pinned tabs, the active tab, and the last tab in a window.
- Do not auto-close newly opened duplicates.
- Treat titles and URLs as untrusted text. Do not render them as HTML.
- Do not log full browsing histories.

## Current priorities

1. Keep the Chromium MVP correct and tested.
2. Verify real browsers before claiming support.
3. Add Safari packaging only with real Xcode/Safari Web Extension tooling.
4. Defer P2 features (session snapshots, reminders, cloud sync research) until the MVP stays green.
