# Roadmap

## Completed

- Chromium Manifest V3 MVP
- Duplicate detection, safe cleanup, search, and parked collections
- One-click park and restore from the popup, dashboard, tab menu, and keyboard shortcut
- First-run tour, export/import, and local settings
- Public GitHub documentation, MIT license, and CI

## Next

1. Capture real toolbar-popup and dashboard screenshots for the store listing.
2. Verify `dist/firefox` in a real Firefox window.
3. Publish a Chrome Web Store listing.
4. Safari packaging only after Chromium and Firefox stay green.

## Known limitations

- Safari is not packaged
- Duplicate awareness cannot see every tab-creation path
- URL reopen undo cannot restore page state
- Last-tab-in-window protection can prevent cleanup of a duplicate that is the only tab in its window
- Logged-out sites cannot be detected without reading page content
