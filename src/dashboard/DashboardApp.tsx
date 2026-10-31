import { useEffect, useMemo, useState } from 'react';
import { STALE_TABS_COPY } from '../shared/copy';
import { reopenedMessage, undoWillReopen } from '../shared/format';
import { eligibleTabIds, planCleanup } from '../shared/duplicates/plan';
import { INBOX_COLLECTION_ID } from '../shared/park/operations';
import { summarizeInventory } from '../shared/inventory/service';
import { groupTabsByDomain } from '../shared/tabs/domain';
import { filterTabs, sortTabs } from '../shared/tabs/sort';
import { findStaleTabs, staleReasonLabel } from '../shared/tabs/stale';
import type { CleanupOperation, DashboardView, InventoryTab, TabFilterKey, TabId, TabSortKey } from '../shared/types';
import { activateTab, parkAndClose, runCleanup, undoLastCleanup } from '../ui/actions';
import { Button } from '../ui/components/Button';
import { DuplicateGroupCard } from '../ui/components/DuplicateGroupCard';
import { EmptyState } from '../ui/components/EmptyState';
import { Logo } from '../ui/components/Logo';
import { ProductTour } from '../ui/components/ProductTour';
import { SearchBox } from '../ui/components/SearchBox';
import { StatusBanner } from '../ui/components/StatusBanner';
import { TabRow } from '../ui/components/TabRow';
import { useInventory } from '../ui/hooks/useInventory';
import { usePersistedState } from '../ui/hooks/useSettings';
import { useTheme } from '../ui/hooks/useTheme';
import styles from './DashboardApp.module.css';
import { NAV, viewFromHash } from './nav';
import { ParkedView } from './ParkedView';
import { SettingsView } from './SettingsView';

export function DashboardApp() {
  const persisted = usePersistedState();
  const inventory = useInventory(persisted.settings);
  useTheme(persisted.settings.theme, persisted.settings.accent);
  const [view, setView] = useState<DashboardView>(() => viewFromHash('overview'));
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<TabId>>(new Set());
  const [selectedOpenTabs, setSelectedOpenTabs] = useState<Set<TabId>>(new Set());
  const [keepOverrides, setKeepOverrides] = useState<Record<string, TabId>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'success' | 'warn' | 'danger' } | null>(null);
  const [sortKey, setSortKey] = useState<TabSortKey>('window');
  const [filter, setFilter] = useState<TabFilterKey>('all');
  const [parkQuery, setParkQuery] = useState('');
  const [selectedParked, setSelectedParked] = useState<Set<string>>(new Set());
  const [collectionName, setCollectionName] = useState('');
  const [activeCollection, setActiveCollection] = useState(INBOX_COLLECTION_ID);
  const [result, setResult] = useState<CleanupOperation | null>(null);

  useEffect(() => {
    const onHash = () => setView(viewFromHash(persisted.settings.defaultDashboardView));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [persisted.settings.defaultDashboardView]);

  useEffect(() => {
    if (!window.location.hash) {
      setView(persisted.settings.defaultDashboardView);
    }
  }, [persisted.settings.defaultDashboardView]);

  const groups = useMemo(
    () =>
      inventory.groups.map((group) =>
        keepOverrides[group.id] ? { ...group, keepTabId: keepOverrides[group.id]! } : group,
      ),
    [inventory.groups, keepOverrides],
  );

  const eligible = useMemo(
    () => eligibleTabIds(groups, persisted.settings, inventory.tabs),
    [groups, inventory.tabs, persisted.settings],
  );

  useEffect(() => {
    setSelectedDuplicates(new Set(eligible));
  }, [eligible]);

  const duplicateIds = useMemo(() => new Set(groups.flatMap((group) => group.members.map((tab) => tab.id))), [groups]);
  const summary = useMemo(() => summarizeInventory(inventory.tabs), [inventory.tabs]);
  const domainGroups = useMemo(() => groupTabsByDomain(inventory.tabs), [inventory.tabs]);
  const visibleTabs = useMemo(
    () => sortTabs(filterTabs(inventory.tabs, filter, duplicateIds), sortKey),
    [duplicateIds, filter, inventory.tabs, sortKey],
  );
  const staleTabs = useMemo(() => findStaleTabs(inventory.tabs), [inventory.tabs]);
  const plan = useMemo(
    () => planCleanup(groups, selectedDuplicates, persisted.settings, inventory.tabs),
    [groups, inventory.tabs, persisted.settings, selectedDuplicates],
  );
  const lastCleanup = persisted.state?.cleanupHistory[0];
  const canUndo = Boolean(lastCleanup?.restoreAvailable);
  const undoPreview = lastCleanup ? undoWillReopen(lastCleanup.closed) : null;

  function windowLabel(windowId: number): string {
    const index = inventory.windows.findIndex((window) => window.id === windowId);
    return `Window ${index >= 0 ? index + 1 : windowId}`;
  }

  function go(next: DashboardView) {
    setView(next);
    window.location.hash = next;
  }

  function toggleDuplicate(tabId: TabId) {
    setSelectedDuplicates((current) => {
      const next = new Set(current);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  }

  function toggleOpenTab(tabId: TabId) {
    setSelectedOpenTabs((current) => {
      const next = new Set(current);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  }

  async function handleCleanup() {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const operation = await runCleanup({
        groups,
        selectedTabIds: selectedDuplicates,
        settings: persisted.settings,
        tabs: inventory.tabs,
      });
      setResult(operation);
      setMessage({
        text:
          operation.failures.length > 0
            ? `Closed ${operation.closed.length} tab${operation.closed.length === 1 ? '' : 's'}. ${operation.failures.length} could not be closed.`
            : `Closed ${operation.closed.length} tab${operation.closed.length === 1 ? '' : 's'}.`,
        tone: operation.failures.length > 0 ? 'warn' : 'info',
      });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Cleanup failed.', tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!persisted.state || !canUndo) {
      return;
    }
    setBusy(true);
    try {
      const closed = persisted.state.cleanupHistory[0]?.closed ?? [];
      const undo = await undoLastCleanup(persisted.state);
      setMessage({ text: reopenedMessage(undo.restored, closed), tone: undo.restored > 0 ? 'info' : 'warn' });
    } finally {
      setBusy(false);
    }
  }

  async function handlePark(tabs: InventoryTab[]) {
    const resultPark = await parkAndClose(tabs, activeCollection, true);
    await persisted.reload();
    setSelectedOpenTabs(new Set());
    setMessage({
      text:
        resultPark.closed === resultPark.parked
          ? `Parked and closed ${resultPark.parked} tab${resultPark.parked === 1 ? '' : 's'}.`
          : `Parked ${resultPark.parked} tab${resultPark.parked === 1 ? '' : 's'}; closed ${resultPark.closed}.`,
      tone: 'info',
    });
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Dashboard">
        <div className={styles.brand}>
          <Logo />
          TwinTabTracker
        </div>
        <div className={styles.links}>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      <main className={styles.main}>
        {!persisted.settings.onboardingCompleted ? (
          <ProductTour onFinish={() => void persisted.saveSettings({ ...persisted.settings, onboardingCompleted: true })} />
        ) : null}
        {inventory.error ? <StatusBanner tone="danger">{inventory.error}</StatusBanner> : null}
        {persisted.error ? <StatusBanner tone="warn">{persisted.error}</StatusBanner> : null}
        {message ? (
          <StatusBanner tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </StatusBanner>
        ) : null}

        {view === 'overview' ? (
          <>
            <header className={styles.heading}>
              <div>
                <h1>Overview</h1>
                <p>Find the tabs you need. Eliminate unnecessary duplicates. Keep your browser under control.</p>
              </div>
              <Button variant="primary" disabled={plan.targets.length === 0 || busy} onClick={() => void handleCleanup()}>
                Clean up {plan.targets.length}
              </Button>
            </header>
            {inventory.loading ? <p className={styles.muted}>Reading open tabs…</p> : null}
            <div className={styles.cards}>
              <button type="button" className={styles.card} onClick={() => go('tabs')}>
                <b>{summary.total}</b>
                Open tabs
              </button>
              <button type="button" className={styles.card} onClick={() => go('duplicates')}>
                <b>{inventory.counts.extraTabs}</b>
                Extra copies
              </button>
              <button
                type="button"
                className={styles.card}
                onClick={() => {
                  setSortKey('domain');
                  go('tabs');
                }}
              >
                <b>{summary.uniqueHosts}</b>
                Unique domains
              </button>
              <button type="button" className={styles.card} onClick={() => go('parked')}>
                <b>{persisted.state?.parkedEntries.length ?? 0}</b>
                Parked
              </button>
            </div>
            <div className={styles.stack}>
              <SearchBox tabs={inventory.tabs} windows={inventory.windows} onActivate={(tab) => void activateTab(tab)} />
              {inventory.counts.extraTabs === 0 ? (
                <EmptyState title="Nothing to clean up">No duplicate URLs were found in the current windows.</EmptyState>
              ) : (
                <StatusBanner tone="info">
                  Cleaning up now would close {plan.targets.length} tab{plan.targets.length === 1 ? '' : 's'} and keep one
                  copy of each group. Pinned and active tabs stay unless you change Settings.
                </StatusBanner>
              )}
              {staleTabs.length > 0 ? (
                <section className={styles.card}>
                  <h2 className={styles.sectionTitle}>Possibly unused · {staleTabs.length}</h2>
                  <p className={styles.muted}>{STALE_TABS_COPY}</p>
                  <div className={styles.grid}>
                    {staleTabs.slice(0, 8).map((item) => (
                      <TabRow
                        key={item.tab.id}
                        tab={item.tab}
                        windowLabel={windowLabel(item.tab.windowId)}
                        onActivate={(tab) => void activateTab(tab)}
                        trailing={
                          <>
                            {item.reasons.map((reason) => (
                              <span key={reason} className={styles.hint}>
                                {staleReasonLabel(reason)}
                              </span>
                            ))}
                            <Button size="sm" onClick={() => void handlePark([item.tab])}>
                              Park
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        ) : null}

        {view === 'duplicates' ? (
          <>
            <header className={styles.heading}>
              <div>
                <h1>Duplicate tabs</h1>
                <p>Review the tab that will be kept, then close the extra copies.</p>
              </div>
            </header>
            <div className={styles.toolbar}>
              <Button onClick={() => setSelectedDuplicates(new Set(eligible))}>Select eligible</Button>
              <Button onClick={() => setSelectedDuplicates(new Set())}>Clear selection</Button>
              <Button variant="primary" disabled={plan.targets.length === 0 || busy} onClick={() => void handleCleanup()}>
                {busy ? 'Cleaning…' : `Close ${plan.targets.length} selected`}
              </Button>
              <Button
                disabled={busy || !canUndo}
                onClick={() => void handleUndo()}
                aria-label={undoPreview ?? 'Undo last cleanup'}
              >
                Undo last cleanup
              </Button>
            </div>
            {canUndo && undoPreview ? <p className={styles.muted}>{undoPreview}</p> : null}
            {groups.length === 0 ? (
              <EmptyState title="No duplicates found">Open the same URL twice to see a group here.</EmptyState>
            ) : (
              <div className={styles.grid}>
                {groups.map((group) => (
                  <DuplicateGroupCard
                    key={group.id}
                    group={group}
                    settings={persisted.settings}
                    selected={selectedDuplicates}
                    onToggle={toggleDuplicate}
                    onKeep={(groupId, tabId) => setKeepOverrides((current) => ({ ...current, [groupId]: tabId }))}
                    onActivate={(tab) => void activateTab(tab)}
                    windowLabel={windowLabel}
                  />
                ))}
              </div>
            )}
            {result ? (
              <p className={styles.muted}>
                Last run closed {result.closed.length}, skipped {result.skipped.length}, failed {result.failures.length}.
              </p>
            ) : null}
          </>
        ) : null}

        {view === 'tabs' ? (
          <>
            <header className={styles.heading}>
              <div>
                <h1>All tabs</h1>
                <p>Search, switch, or park a tab in one click. Parking saves the URL and closes the tab.</p>
              </div>
            </header>
            <div className={styles.toolbar}>
              <label className={styles.field}>
                Filter
                <select value={filter} onChange={(event) => setFilter(event.target.value as TabFilterKey)}>
                  <option value="all">All</option>
                  <option value="duplicated">Duplicated</option>
                  <option value="stale">Possibly unused</option>
                  <option value="pinned">Pinned</option>
                  <option value="active">Active</option>
                  <option value="restricted">Restricted</option>
                </select>
              </label>
              <label className={styles.field}>
                Sort
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value as TabSortKey)}>
                  <option value="window">Window</option>
                  <option value="title">Title</option>
                  <option value="domain">Domain</option>
                  <option value="url">URL</option>
                </select>
              </label>
              <Button
                disabled={[...selectedOpenTabs].every((id) => !visibleTabs.some((tab) => tab.id === id))}
                onClick={() => void handlePark(visibleTabs.filter((tab) => selectedOpenTabs.has(tab.id)))}
              >
                {selectedOpenTabs.size > 0 ? `Park ${selectedOpenTabs.size} selected` : 'Park selected'}
              </Button>
            </div>
            <SearchBox tabs={inventory.tabs} windows={inventory.windows} onActivate={(tab) => void activateTab(tab)} />
            {visibleTabs.length === 0 ? (
              <EmptyState title="No tabs match">Try another filter or wait for the inventory to load.</EmptyState>
            ) : (
              <div className={styles.stack}>
                {domainGroups
                  .map((group) => ({
                    ...group,
                    tabs: group.tabs.filter((tab) => visibleTabs.some((item) => item.id === tab.id)),
                  }))
                  .filter((group) => group.tabs.length > 0)
                  .map((group) => (
                    <section key={group.domain} className={styles.card}>
                      <h2 className={styles.sectionTitle}>
                        {group.label} · {group.tabs.length}
                      </h2>
                      {group.tabs.map((tab) => (
                        <TabRow
                          key={tab.id}
                          tab={tab}
                          windowLabel={windowLabel(tab.windowId)}
                          selected={selectedOpenTabs.has(tab.id)}
                          onToggle={() => toggleOpenTab(tab.id)}
                          onActivate={(item) => void activateTab(item)}
                          trailing={
                            tab.url && !tab.restricted ? (
                              <Button size="sm" onClick={() => void handlePark([tab])}>
                                Park
                              </Button>
                            ) : null
                          }
                        />
                      ))}
                    </section>
                  ))}
              </div>
            )}
          </>
        ) : null}

        {view === 'parked' || view === 'collections' ? (
          <ParkedView
            view={view}
            persisted={persisted}
            parkQuery={parkQuery}
            setParkQuery={setParkQuery}
            selectedParked={selectedParked}
            setSelectedParked={setSelectedParked}
            collectionName={collectionName}
            setCollectionName={setCollectionName}
            activeCollection={activeCollection}
            setActiveCollection={setActiveCollection}
          />
        ) : null}

        {view === 'settings' ? (
          <SettingsView settings={persisted.settings} onSave={(next) => void persisted.saveSettings(next)} />
        ) : null}
      </main>
    </div>
  );
}
