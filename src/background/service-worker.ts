import { getChromeLike, subscribe } from '../shared/browser/runtime';
import { getBrowserAdapter } from '../shared/browser/adapter';
import { log } from '../shared/log';
import { refreshBadge } from './badge';
import { handlePotentialDuplicate } from './prevention';

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

function start(): void {
  const api = getChromeLike();
  const adapter = getBrowserAdapter();
  const scheduleBadge = debounce(() => {
    void refreshBadge();
  }, 200);

  api.runtime?.onInstalled?.addListener(() => {
    void refreshBadge();
  });
  api.runtime?.onStartup?.addListener(() => {
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
  });

  void refreshBadge();
}

try {
  start();
} catch (error) {
  log.warn('Background worker could not start.', error);
}
