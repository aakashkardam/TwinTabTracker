# Roadmap

The Chromium and Firefox packages are ready to load from `dist/`. Safari is not packaged.

Later work, only after the current product stays green:

- Safari, with real Xcode / Safari Web Extension tooling
- Session snapshots, reminders, and cloud-sync research

## Known limitations

- Safari is not packaged
- Duplicate awareness cannot see every tab-creation path
- URL reopen undo cannot restore page state
- Last-tab-in-window protection can prevent cleanup of a duplicate that is the only tab in its window
- Logged-out sites cannot be detected without reading page content
