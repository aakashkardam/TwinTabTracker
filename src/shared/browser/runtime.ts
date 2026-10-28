import type { BrowserAdapter } from './types';

interface ChromeLike {
  runtime?: {
    lastError?: { message?: string };
    getURL?: (path: string) => string;
    getManifest?: () => { options_ui?: { page?: string } };
    onInstalled?: { addListener: (cb: () => void) => void };
    onStartup?: { addListener: (cb: () => void) => void };
    onMessage?: {
      addListener: (cb: (message: unknown, sender: unknown, sendResponse: (v: unknown) => void) => void) => void;
    };
  };
  tabs?: {
    query: (query: Record<string, unknown>) => Promise<unknown[]>;
    get: (id: number) => Promise<unknown>;
    update: (id: number, props: Record<string, unknown>) => Promise<unknown>;
    remove: (ids: number | number[]) => Promise<void>;
    create: (props: Record<string, unknown>) => Promise<unknown>;
    onCreated?: EventLike<(tab: unknown) => void>;
    onUpdated?: EventLike<(tabId: number, change: unknown, tab: unknown) => void>;
    onRemoved?: EventLike<(tabId: number) => void>;
    onMoved?: EventLike<(tabId: number, info: unknown) => void>;
    onActivated?: EventLike<(info: unknown) => void>;
    onReplaced?: EventLike<(added: number, removed: number) => void>;
  };
  windows?: {
    getAll: (query?: Record<string, unknown>) => Promise<unknown[]>;
    update: (id: number, props: Record<string, unknown>) => Promise<unknown>;
    WINDOW_ID_NONE?: number;
    onRemoved?: EventLike<(id: number) => void>;
    onFocusChanged?: EventLike<(id: number) => void>;
  };
  storage?: {
    local: {
      get: (keys?: unknown) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
      clear: () => Promise<void>;
    };
  };
  action?: {
    setBadgeText: (details: { text: string }) => Promise<void> | void;
    setBadgeBackgroundColor: (details: { color: string }) => Promise<void> | void;
    setBadgeTextColor?: (details: { color: string }) => Promise<void> | void;
  };
  browserAction?: {
    setBadgeText: (details: { text: string }) => Promise<void> | void;
    setBadgeBackgroundColor: (details: { color: string }) => Promise<void> | void;
  };
  sessions?: {
    getRecentlyClosed: (filter?: { maxResults?: number }) => Promise<unknown[]>;
    restore: (sessionId: string) => Promise<unknown>;
  };
  commands?: {
    onCommand?: EventLike<(command: string) => void>;
  };
}

interface EventLike<T extends (...args: never[]) => void> {
  addListener: (cb: T) => void;
  removeListener: (cb: T) => void;
}

export class BrowserUnavailableError extends Error {
  constructor(message = 'Browser extension APIs are unavailable in this context.') {
    super(message);
    this.name = 'BrowserUnavailableError';
  }
}

export function getChromeLike(): ChromeLike {
  const globalObject = globalThis as unknown as { browser?: ChromeLike; chrome?: ChromeLike };
  const api = globalObject.browser ?? globalObject.chrome;
  if (!api) {
    throw new BrowserUnavailableError();
  }
  return api;
}

export function hasBrowserApi(): boolean {
  try {
    getChromeLike();
    return true;
  } catch {
    return false;
  }
}

function throwLastError(api: ChromeLike): void {
  const message = api.runtime?.lastError?.message;
  if (message) {
    throw new Error(message);
  }
}

export function subscribe<T extends (...args: never[]) => void>(
  event: EventLike<T> | undefined,
  listener: T,
): () => void {
  if (!event) {
    return () => undefined;
  }
  event.addListener(listener);
  return () => event.removeListener(listener);
}

export function withLastError<T>(api: ChromeLike, value: T): T {
  throwLastError(api);
  return value;
}

let adapterOverride: BrowserAdapter | null = null;

export function setBrowserAdapterForTests(adapter: BrowserAdapter | null): void {
  adapterOverride = adapter;
}

export function getAdapterOverride(): BrowserAdapter | null {
  return adapterOverride;
}

export { type ChromeLike };
