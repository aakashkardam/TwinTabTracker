function isDev(): boolean {
  try {
    return import.meta.env.DEV === true;
  } catch {
    return false;
  }
}

export const log = {
  debug: (...args: unknown[]): void => {
    if (isDev()) {
      console.debug('[TwinTabTracker]', ...args);
    }
  },
  warn: (...args: unknown[]): void => {
    console.warn('[TwinTabTracker]', ...args);
  },
  error: (...args: unknown[]): void => {
    console.error('[TwinTabTracker]', ...args);
  },
};
