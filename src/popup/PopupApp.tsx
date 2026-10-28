import { useEffect, useMemo, useState } from 'react';
import { SKIP_REASON_LABEL } from '../shared/copy';
import { eligibleTabIds } from '../shared/duplicates/plan';
import { Button } from '../ui/components/Button';
import { EmptyState } from '../ui/components/EmptyState';
import { Logo } from '../ui/components/Logo';
import { SearchBox } from '../ui/components/SearchBox';
import { StatusBanner } from '../ui/components/StatusBanner';
import { activateTab, dismissNotice, openDashboard, runCleanup, undoLastCleanup } from '../ui/actions';
import { useInventory } from '../ui/hooks/useInventory';
import { usePersistedState } from '../ui/hooks/useSettings';
import { useTheme } from '../ui/hooks/useTheme';
import type { CleanupOperation } from '../shared/types';
import styles from './PopupApp.module.css';

export function PopupApp() {
  const persisted = usePersistedState();
  const inventory = useInventory(persisted.settings);
  useTheme(persisted.settings.theme);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CleanupOperation | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const eligible = useMemo(
    () => eligibleTabIds(inventory.groups, persisted.settings, inventory.tabs),
    [inventory.groups, inventory.tabs, persisted.settings],
  );

  useEffect(() => {
    if (!result && persisted.state?.cleanupHistory[0]) {
      setResult(persisted.state.cleanupHistory[0]);
    }
  }, [persisted.state, result]);

  const uniqueCount = Math.max(0, inventory.tabs.length - inventory.counts.extraTabs);
  const notice = persisted.state?.lastDuplicateNotice;

  async function handleCleanup() {
    if (eligible.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const operation = await runCleanup({
        groups: inventory.groups,
        selectedTabIds: eligible,
        settings: persisted.settings,
        tabs: inventory.tabs,
      });
      setResult(operation);
      const closed = operation.closed.length;
      const failed = operation.failures.length;
      const skipped = operation.skipped.filter((item) => item.reason !== 'keep-tab' && item.reason !== 'not-selected');
      setStatus(
        failed > 0
          ? `Closed ${closed} tab${closed === 1 ? '' : 's'}. ${failed} could not be closed.`
          : `Closed ${closed} duplicate${closed === 1 ? '' : 's'}. ${skipped.length > 0 ? `${skipped.length} skipped.` : ''}`.trim(),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Cleanup failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!persisted.state || busy) {
      return;
    }
    setBusy(true);
    try {
      const undo = await undoLastCleanup(persisted.state);
      setStatus(
        undo.restored > 0
          ? `Restored ${undo.restored} tab${undo.restored === 1 ? '' : 's'}. ${undo.messages[0] ?? ''}`
          : undo.messages[0] ?? 'Nothing was restored.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Undo failed.');
    } finally {
      setBusy(false);
    }
  }

  if (inventory.error) {
    return (
      <main className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <Logo /> TwinTabTracker
          </div>
        </header>
        <div className={styles.body}>
          <StatusBanner tone="danger">{inventory.error}</StatusBanner>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo />
          <span>TwinTabTracker</span>
        </div>
        <div className={styles.headerActions}>
          <Button size="sm" variant="ghost" onClick={() => void openDashboard('#settings')} aria-label="Open settings">
            Settings
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void openDashboard('#overview')}>
            Dashboard
          </Button>
        </div>
      </header>
      <div className={styles.body}>
        <SearchBox
          tabs={inventory.tabs}
          windows={inventory.windows}
          onActivate={(tab) => void activateTab(tab)}
        />
        {inventory.loading ? <p className={styles.busy}>Reading open tabs…</p> : null}
        {persisted.error ? <StatusBanner tone="warn">{persisted.error}</StatusBanner> : null}
        {notice ? (
          <StatusBanner
            tone="info"
            actions={
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    const tab = inventory.tabs.find((item) => item.id === notice.existingTabId);
                    if (tab) {
                      void activateTab(tab);
                    }
                    void dismissNotice().then(() => persisted.reload());
                  }}
                >
                  Switch
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void dismissNotice().then(() => persisted.reload())}>
                  Dismiss
                </Button>
              </>
            }
          >
            A duplicate of {notice.title || notice.url} is already open.
          </StatusBanner>
        ) : null}

        <div className={styles.stats} aria-label="Tab summary">
          <div className={styles.stat}>
            <b>{inventory.tabs.length}</b>
            <span>Open tabs</span>
          </div>
          <div className={styles.stat}>
            <b>{inventory.counts.extraTabs}</b>
            <span>Duplicates</span>
          </div>
          <div className={styles.stat}>
            <b>{uniqueCount}</b>
            <span>Unique</span>
          </div>
        </div>

        {inventory.tabs.length === 0 && !inventory.loading ? (
          <EmptyState title="No tabs found">The browser did not report any open tabs.</EmptyState>
        ) : inventory.counts.extraTabs === 0 ? (
          <EmptyState title="No duplicates right now">
            TwinTabTracker will group tabs that share the same canonical URL.
          </EmptyState>
        ) : (
          <StatusBanner tone="info">
            {inventory.counts.groupCount} duplicate group{inventory.counts.groupCount === 1 ? '' : 's'} · {eligible.length}{' '}
            eligible to close. Pinned and active tabs stay open by default.
          </StatusBanner>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => void openDashboard('#duplicates')}>
            Review
          </Button>
          <Button variant="primary" disabled={eligible.length === 0 || busy} onClick={() => void handleCleanup()}>
            {busy ? 'Working…' : `Clean up ${eligible.length}`}
          </Button>
        </div>

        {status ? <StatusBanner tone={status.toLowerCase().includes('fail') ? 'danger' : 'success'}>{status}</StatusBanner> : null}
        {result?.restoreAvailable ? (
          <StatusBanner
            tone="info"
            actions={
              <Button size="sm" onClick={() => void handleUndo()} disabled={busy}>
                Undo
              </Button>
            }
          >
            Last cleanup closed {result.closed.length} tab{result.closed.length === 1 ? '' : 's'}.
            {result.restoreMethod === 'reopen-url' ? ' Undo reopens the original URLs.' : ''}
          </StatusBanner>
        ) : result && result.closed.length > 0 && !result.restoreAvailable ? (
          <StatusBanner tone="warn">Cleanup finished, but restoration is not available for those tabs.</StatusBanner>
        ) : null}

        {result && result.failures.length > 0 ? (
          <StatusBanner tone="danger">
            {result.failures[0]?.message}. {result.skipped[0] ? SKIP_REASON_LABEL[result.skipped[0].reason] : ''}
          </StatusBanner>
        ) : null}

        <Button variant="ghost" onClick={() => void openDashboard('#parked')}>
          {persisted.state?.parkedEntries.length ?? 0} parked tabs
        </Button>
      </div>
    </main>
  );
}
