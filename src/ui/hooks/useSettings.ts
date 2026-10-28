import { useCallback, useEffect, useState } from 'react';
import { getBrowserAdapter } from '../../shared/browser/adapter';
import { DEFAULT_SETTINGS } from '../../shared/settings/defaults';
import { createStorageClient } from '../../shared/storage/client';
import type { AppSettings, PersistedState } from '../../shared/types';

export function usePersistedState() {
  const [state, setState] = useState<PersistedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const storage = createStorageClient(getBrowserAdapter());
      const next = await storage.read();
      setState(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Storage is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = useCallback(async (mutator: (current: PersistedState) => PersistedState) => {
    const storage = createStorageClient(getBrowserAdapter());
    const next = await storage.update(mutator);
    setState(next);
    return next;
  }, []);

  const saveSettings = useCallback(
    async (settings: AppSettings) => {
      await update((current) => ({ ...current, settings }));
    },
    [update],
  );

  return {
    state,
    settings: state?.settings ?? DEFAULT_SETTINGS,
    loading,
    error,
    reload,
    update,
    saveSettings,
  };
}
