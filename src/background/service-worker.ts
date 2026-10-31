import { getChromeLike, subscribe } from '../shared/browser/runtime';
import { getBrowserAdapter } from '../shared/browser/adapter';
import type { RawBrowserTab } from '../shared/browser/types';
import { log } from '../shared/log';
import { parkRawTabs } from '../ui/actions';
import { refreshBadge } from './badge';
import { handlePotentialDuplicate } from './prevention';

const PARK_MENU_ID = 'park-tab';

function debounce(fn: () => void, wait: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, wait);
  };
}

function installContextMenus(): void {
  const api = getChromeLike();
  const menus = api.contextMenus;
  if (!menus?.create) {
    return;
  }
  const create = () => {
    try {
      menus.create({
        id: PARK_MENU_ID,
        title: 'Park this tab',
        contexts: ['tab', 'page'],
      });
    } catch {
      menus.create({
        id: PARK_MENU_ID,
        title: 'Park this tab',
        contexts: ['page'],
      });
    }
  };
  if (menus.removeAll) {
    menus.removeAll(() => create());
    return;
  }
  create();
}

async function parkFromRaw(raw: RawBrowserTab | undefined): Promise<void> {
  if (!raw?.id) {
    return;
  }
  try {
    await parkRawTabs([raw]);
    void refreshBadge();
  } catch (error) {
    log.warn('Could not park the requested tab.', error);
  }
}

function start(): void {
  const api = getChromeLike();
  const adapter = getBrowserAdapter();
  const scheduleBadge = debounce(() => {
    void refreshBadge();
  }, 200);

  api.runtime?.onInstalled?.addListener(() => {
    installContextMenus();
    void refreshBadge();
  });
  api.runtime?.onStartup?.addListener(() => {
    installContextMenus();
    void refreshBadge();
  });

  adapter.onTabCreated((tab) => {
    scheduleBadge();
    void handlePotentialDuplicate(tab);
  });
  adapter.onTabUpdated((_id, change, tab) => {
    if (change.url || change.status === 'complete') {
      scheduleBadge();
      if (change.url) {
        void handlePotentialDuplicate(tab);
      }
    }
  });
  adapter.onTabRemoved(() => scheduleBadge());
  adapter.onTabMoved(() => scheduleBadge());
  adapter.onWindowRemoved(() => scheduleBadge());

  subscribe(api.commands?.onCommand, (command) => {
    if (command === 'open-dashboard') {
      void adapter.openDashboard('#overview');
    }
    if (command === 'park-current-tab') {
      void adapter.queryTabs().then((tabs) => {
        const current = tabs.find((tab) => tab.active);
        return parkFromRaw(current);
      });
    }
  });

  subscribe(api.contextMenus?.onClicked, (info, tab) => {
    if (info.menuItemId !== PARK_MENU_ID) {
      return;
    }
    void parkFromRaw(tab as RawBrowserTab | undefined);
  });

  installContextMenus();
  void refreshBadge();
}

try {
  start();
} catch (error) {
  log.warn('Background worker could not start.', error);
}
