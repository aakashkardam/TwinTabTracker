# Privacy

TwinTabTracker is local-first. The features in this repository do not send browsing data to TwinTabTracker servers because the product has no backend.

## What is stored locally

Browser `storage.local` key `twintabtracker.state` may contain:

- user settings
- parked tab URLs, titles, favicon URLs, collection names, timestamps, and optional notes
- recent cleanup records (tab IDs, URLs, titles, and session IDs when available)
- the latest duplicate-awareness notice

Open-tab inventories are read from the browser when the UI or badge needs them. They are not stored as a full history.

## Why it is stored

Settings need to survive popup close and service-worker restart. Parked tabs are the user's saved list. Cleanup history exists so Undo can work. History length is bounded by the cleanup history setting (default 20).

## Permissions

- `tabs`: required to see which tabs are open, find duplicates, switch to a tab, and close selected extras.
- `storage`: required for local preferences and saved collections.
- `sessions`: used only to restore recently closed tabs after cleanup when the API is available.

There are no host permissions, no content scripts, and no remote fonts, scripts, or stylesheets.

## External communication

The extension code does not phone home. Websites you open in ordinary tabs still load as they normally would. Favicons may be requested from the site that provided them when the UI displays a tab row.

If you install the extension from a future store listing, that store's own update and distribution network is outside this product's code.

## Deletion and retention

- Remove parked entries and collections from the dashboard.
- Restore settings to defaults from Settings.
- Uninstalling the extension deletes `storage.local` for this extension.
- Cleanup history older than the configured limit is discarded.

Private windows are visible only when the browser user enables the extension in those windows.
