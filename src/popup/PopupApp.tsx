import { useEffect, useMemo, useState } from 'react';
import { SKIP_REASON_LABEL } from '../shared/copy';
import { reopenedMessage, undoWillReopen } from '../shared/format';
import { eligibleTabIds } from '../shared/duplicates/plan';
import { canParkTab, findCurrentTab } from '../shared/tabs/current';
import type { CleanupOperation, ParkedEntry } from '../shared/types';
import {
  activateTab,
  dismissNotice,
  openDashboard,
  parkAndClose,
  restoreParkedEntries,
  runCleanup,
  undoLastCleanup,
} from '../ui/actions';
import { Button } from '../ui/components/Button';
import { EmptyState } from '../ui/components/EmptyState';
import { Logo } from '../ui/components/Logo';
import { ParkedRow } from '../ui/components/ParkedRow';
import { ProductTour } from '../ui/components/ProductTour';
import { SearchBox } from '../ui/components/SearchBox';
import { StatusBanner } from '../ui/components/StatusBanner';
import { useInventory } from '../ui/hooks/useInventory';
import { usePersistedState } from '../ui/hooks/useSettings';
import { useTheme } from '../ui/hooks/useTheme';
import styles from './PopupApp.module.css';

export function PopupApp() {
  const persisted = usePersistedState();
  const inventory = useInventory(persisted.settings);
  useTheme(persisted.settings.theme, persisted.settings.accent);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CleanupOperation | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dismissedCleanupId, setDismissedCleanupId] = useState<string | null>(null);

  const eligible = useMemo(
    () => eligibleTabIds(inventory.groups, persisted.settings, inventory.tabs),
    [inventory.groups, inventory.tabs, persisted.settings],
  );
  const currentTab = useMemo(
    () => findCurrentTab(inventory.tabs, inventory.windows),
    [inventory.tabs, inventory.windows],
  );
  const parkedEntries = persisted.state?.parkedEntries ?? [];
  const recentParked = parkedEntries.slice(0, 6);
  const notice = persisted.state?.lastDuplicateNotice;

  useEffect(() => {
    const latest = persisted.state?.cleanupHistory[0];
    if (latest && !result && latest.id !== dismissedCleanupId) {
      setResult(latest);
    }
  }, [dismissedCleanupId, persisted.state, result]);

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
      const closed = persisted.state.cleanupHistory[0]?.closed ?? [];
      const undo = await undoLastCleanup(persisted.state);
      setStatus(reopenedMessage(undo.restored, closed));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Undo failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleParkCurrent() {
    if (!canParkTab(currentTab) || busy) {
      return;
    }
    setBusy(true);
    try {
      const parked = await parkAndClose([currentTab], 'inbox', true);
      await persisted.reload();
      setStatus(
        parked.closed > 0
          ? 'Parked and closed this tab. Click it below to open it again.'
          : parked.parked > 0
            ? 'Saved this tab. It stayed open because it is pinned or the last tab in its window.'
            : 'This tab cannot be parked.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not park this tab.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenParked(entry: ParkedEntry) {
    await restoreParkedEntries([entry], persisted.settings.deleteParkedAfterRestore);
    if (persisted.settings.deleteParkedAfterRestore) {
      await persisted.reload();
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
        {!persisted.settings.onboardingCompleted ? (
          <ProductTour onFinish={() => void persisted.saveSettings({ ...persisted.settings, onboardingCompleted: true })} />
        ) : null}
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
          <button type="button" className={styles.stat} onClick={() => void openDashboard('#tabs')}>
            <b>{inventory.tabs.length}</b>
            <span>Open tabs</span>
          </button>
          <button type="button" className={styles.stat} onClick={() => void openDashboard('#duplicates')}>
            <b>{inventory.counts.extraTabs}</b>
            <span>Duplicates</span>
          </button>
          <button type="button" className={styles.stat} onClick={() => void openDashboard('#parked')}>
            <b>{parkedEntries.length}</b>
            <span>Parked</span>
          </button>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" disabled={!canParkTab(currentTab) || busy} onClick={() => void handleParkCurrent()}>
            {busy ? 'Working…' : 'Park this tab'}
          </Button>
          <Button variant="secondary" disabled={eligible.length === 0 || busy} onClick={() => void handleCleanup()}>
            Clean up {eligible.length}
          </Button>
        </div>
        {currentTab ? (
          <p className={styles.busy}>
            {canParkTab(currentTab)
              ? 'Saves the URL locally and closes this tab.'
              : 'The current tab is a restricted browser page and cannot be parked.'}
          </p>
        ) : null}

        {inventory.tabs.length === 0 && !inventory.loading ? (
          <EmptyState className={styles.empty} title="No tabs found">
            The browser did not report any open tabs.
          </EmptyState>
        ) : inventory.counts.extraTabs === 0 ? (
          <EmptyState className={styles.empty} title="No duplicates right now">
            Extra copies of the same URL will show up here for one-click cleanup.
          </EmptyState>
        ) : (
          <StatusBanner
            tone="info"
            actions={
              <Button size="sm" variant="ghost" onClick={() => void openDashboard('#duplicates')}>
                Review
              </Button>
            }
          >
            {inventory.counts.groupCount} duplicate group{inventory.counts.groupCount === 1 ? '' : 's'} · {eligible.length}{' '}
            eligible to close.
          </StatusBanner>
        )}

        {status ? (
          <StatusBanner
            tone={status.toLowerCase().includes('fail') ? 'danger' : 'info'}
            onDismiss={() => setStatus(null)}
          >
            {status}
          </StatusBanner>
        ) : null}
        {result?.restoreAvailable ? (
          <StatusBanner
            tone="info"
            actions={
              <Button size="sm" onClick={() => void handleUndo()} disabled={busy}>
                Undo
              </Button>
            }
            onDismiss={() => {
              setDismissedCleanupId(result.id);
              setResult(null);
            }}
          >
            {undoWillReopen(result.closed)}
          </StatusBanner>
        ) : result && result.closed.length > 0 && !result.restoreAvailable ? (
          <StatusBanner
            tone="warn"
            onDismiss={() => {
              setDismissedCleanupId(result.id);
              setResult(null);
            }}
          >
            Cleanup finished, but those tabs cannot be reopened from here.
          </StatusBanner>
        ) : null}

        {result && result.failures.length > 0 ? (
          <StatusBanner tone="danger">
            {result.failures[0]?.message}. {result.skipped[0] ? SKIP_REASON_LABEL[result.skipped[0].reason] : ''}
          </StatusBanner>
        ) : null}

        <section className={styles.parked}>
          <div className={styles.parkedHeader}>
            <h2>Parked tabs</h2>
            <Button size="sm" variant="ghost" onClick={() => void openDashboard('#parked')}>
              See all
            </Button>
          </div>
          {recentParked.length === 0 ? (
            <p className={styles.busy}>Nothing parked yet. Park this tab, or right-click a browser tab and choose Park this tab.</p>
          ) : (
            <div className={styles.parkedList}>
              {recentParked.map((entry) => (
                <ParkedRow key={entry.id} entry={entry} onOpen={(item) => void handleOpenParked(item)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
