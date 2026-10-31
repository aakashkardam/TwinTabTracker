# Testing

## Automated tests

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
```

Vitest runs unit tests for URL normalization, duplicate grouping, keep-tab selection, cleanup planning/execution, undo, search, inventory reduction, domain grouping, storage migrations, and parked collections. React Testing Library covers popup and dashboard rendering with a mocked browser adapter (`src/test/memory-browser.ts`).

Those mocked tests are not a substitute for loading the extension in a real browser.

## Browser testing

After `npm run build:chrome`:

1. Load `dist/chrome` as an unpacked extension in Chrome.
2. Open several tabs including two copies of the same URL.
3. Confirm the popup lists the extra copies.
4. Run cleanup and confirm the kept tab remains.
5. Use Undo.
6. Search for a title and confirm the existing tab activates.
7. Change a setting, close the popup, reopen, and confirm it persisted.
8. Open the dashboard from the popup.
9. Park the current tab from the popup and confirm it leaves the tab strip.
10. Click the parked row in the popup and confirm the URL opens.
11. Right-click a browser tab and confirm **Park this tab** appears.

Firefox: load `dist/firefox` via `about:debugging` → This Firefox → Load Temporary Add-on → select `dist/firefox/manifest.json`.

Safari: not packaged.

## Automated results recorded in this environment

- `npm test`: 19 files, 61 tests, all passed
- `npm run typecheck`: passed
- `npm run lint`: passed with no errors
- `npm run build:chrome`: passed; package in `dist/chrome`
- `npm run build:firefox`: passed; package in `dist/firefox`
- Synthetic timing in Node: 300 tabs detect+search about 19–33ms; 1000 tabs smart detect+search about 36–86ms

Shared-module statement coverage from `npm run test:coverage` was about 73%. Browser adapter UI wiring is mostly excluded from those unit tests and is covered by the Chrome smoke script.

## Real-browser results recorded in this environment

`npm run test:chrome` loaded `dist/chrome` in **Chrome for Testing 156.0.8078.4** (Playwright Chromium), not branded Google Chrome.

Observed:

- The service worker started.
- The popup rendered TwinTabTracker, tab counts, and empty/duplicate states.
- Search for `example` matched open `example.com` tabs and did not create a new tab.
- Two `https://example.com` tabs produced one duplicate group and a duplicate-awareness banner.
- **Clean up 1** closed one duplicate. The remaining copy stayed open.
- Dashboard navigation opened Overview, Duplicates, All tabs, and Settings without page errors.

Branded Google Chrome 156 is installed on this machine, but official Chrome builds ignore `--load-extension`. That browser was **not** automation-tested. Load `dist/chrome` with **Load unpacked** on `chrome://extensions` to verify it there.

Firefox is not installed here. Safari packaging is not implemented. Edge, Brave, and Opera were not tested.
