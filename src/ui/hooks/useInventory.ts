import { useEffect, useMemo, useState } from 'react';
import { getBrowserAdapter } from '../../shared/browser/adapter';
import { detectDuplicateGroups, duplicateCounts } from '../../shared/duplicates/detect';
import { loadInventory, subscribeInventory } from '../../shared/inventory/service';
import type { AppSettings, InventorySnapshot } from '../../shared/types';

const EMPTY: InventorySnapshot = { tabs: [], windows: [], generatedAt: 0 };

export function useInventory(settings: AppSettings) {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const adapter = getBrowserAdapter();
    void loadInventory(adapter)
      .then((value) => {
        if (!alive) {
          return;
        }
        setSnapshot(value);
        setError(null);
      })
      .catch((caught) => {
        if (!alive) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Unable to read open tabs.');
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    const unsub = subscribeInventory((value) => {
      if (!alive) {
        return;
      }
      setSnapshot(value);
      setError(null);
      setLoading(false);
    }, adapter);

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const focusedWindowId = snapshot.windows.find((window) => window.focused)?.id ?? null;
  const groups = useMemo(
    () => detectDuplicateGroups(snapshot.tabs, settings, focusedWindowId),
    [snapshot.tabs, settings, focusedWindowId],
  );
  const counts = useMemo(() => duplicateCounts(groups), [groups]);

  return {
    snapshot,
    tabs: snapshot.tabs,
    windows: snapshot.windows,
    groups,
    counts,
    loading,
    error,
    focusedWindowId,
  };
}
