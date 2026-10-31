export type BrowserTarget = 'chrome' | 'firefox';

const ICONS = {
  '16': 'icons/icon16.png',
  '48': 'icons/icon48.png',
  '128': 'icons/icon128.png',
} as const;

export function buildManifest(browser: BrowserTarget) {
  const background =
    browser === 'firefox'
      ? { scripts: ['src/background/service-worker.ts'] }
      : { service_worker: 'src/background/service-worker.ts', type: 'module' as const };

  return {
    manifest_version: 3,
    name: 'TwinTabTracker',
    short_name: 'TwinTab',
    version: '1.0.0',
    description:
      'Find the tabs you need. Eliminate unnecessary duplicates. Keep your browser under control.',
    icons: ICONS,
    action: {
      default_title: 'TwinTabTracker',
      default_popup: 'src/popup/index.html',
      default_icon: ICONS,
    },
    options_ui: {
      page: 'src/dashboard/index.html',
      open_in_tab: true,
    },
    background,
    permissions: ['tabs', 'storage', 'sessions', 'contextMenus'],
    content_security_policy: {
      extension_pages:
        browser === 'firefox'
          ? "script-src 'self'; object-src 'self'; img-src 'self' data: https:;"
          : "script-src 'self'; object-src 'self'; img-src 'self' data: https: chrome:;",
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+Shift+D',
        },
        description: 'Open TwinTabTracker popup',
      },
      'open-dashboard': {
        suggested_key: {
          default: 'Alt+Shift+T',
        },
        description: 'Open TwinTabTracker dashboard',
      },
      'park-current-tab': {
        suggested_key: {
          default: 'Alt+Shift+P',
        },
        description: 'Park the current tab',
      },
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'twintabtracker@local',
              strict_min_version: '115.0',
            },
          },
        }
      : {}),
  };
}
