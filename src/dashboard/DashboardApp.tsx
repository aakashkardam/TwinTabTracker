import { useEffect, useMemo, useState } from 'react';
import { SUGGESTED_COLLECTION_NAMES } from '../shared/copy';
import { eligibleTabIds, planCleanup } from '../shared/duplicates/plan';
import {
  createCollection,
  deleteCollection,
  deleteParkedEntries,
  INBOX_COLLECTION_ID,
  renameCollection,
  searchParked,
} from '../shared/park/operations';
import { DEFAULT_SETTINGS } from '../shared/settings/defaults';
import { groupTabsByDomain } from '../shared/tabs/domain';
import { filterTabs, sortTabs } from '../shared/tabs/sort';
import { summarizeInventory } from '../shared/inventory/service';
import type {
  AppSettings,
  CleanupOperation,
  DashboardView,
  InventoryTab,
  TabFilterKey,
  TabId,
  TabSortKey,
} from '../shared/types';
import { Button } from '../ui/components/Button';
import { DuplicateGroupCard } from '../ui/components/DuplicateGroupCard';
import { EmptyState } from '../ui/components/EmptyState';
import { Logo } from '../ui/components/Logo';
import { SearchBox } from '../ui/components/SearchBox';
import { StatusBanner } from '../ui/components/StatusBanner';
import { TabRow } from '../ui/components/TabRow';
import {
  activateTab,
  parkSelected,
  restoreParked,
  runCleanup,
  undoLastCleanup,
} from '../ui/actions';
import { useInventory } from '../ui/hooks/useInventory';
import { usePersistedState } from '../ui/hooks/useSettings';
import { useTheme } from '../ui/hooks/useTheme';
import styles from './DashboardApp.module.css';

const NAV: Array<{ id: DashboardView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'tabs', label: 'All tabs' },
  { id: 'parked', label: 'Parked tabs' },
  { id: 'collections', label: 'Collections' },
  { id: 'settings', label: 'Settings' },
];

function viewFromHash(fallback: DashboardView): DashboardView {
  const hash = window.location.hash.replace('#', '') as DashboardView;
  return NAV.some((item) => item.id === hash) ? hash : fallback;
}

export function DashboardApp() {
  const persisted = usePersistedState();
  const inventory = useInventory(persisted.settings);
  useTheme(persisted.settings.theme);
  const [view, setView] = useState<DashboardView>(() => viewFromHash('overview'));
  const [selected, setSelected] = useState<Set<TabId>>(new Set());
  const [keepOverrides, setKeepOverrides] = useState<Record<string, TabId>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
        keepOverrides[group.id]
          ? { ...group, keepTabId: keepOverrides[group.id]! }
          : group,
      ),
    [inventory.groups, keepOverrides],
  );

  const eligible = useMemo(
    () => eligibleTabIds(groups, persisted.settings, inventory.tabs),
    [groups, inventory.tabs, persisted.settings],
  );

  useEffect(() => {
    setSelected(new Set(eligible));
  }, [eligible]);

  const duplicateIds = useMemo(() => new Set(groups.flatMap((group) => group.members.map((tab) => tab.id))), [groups]);
  const summary = summarizeInventory(inventory.tabs);
  const domainGroups = groupTabsByDomain(inventory.tabs);
  const visibleTabs = sortTabs(filterTabs(inventory.tabs, filter, duplicateIds), sortKey);

  function windowLabel(windowId: number): string {
    const index = inventory.windows.findIndex((window) => window.id === windowId);
    return `Window ${index >= 0 ? index + 1 : windowId}`;
  }

  function go(next: DashboardView) {
    setView(next);
    window.location.hash = next;
  }

  function toggle(tabId: TabId) {
    setSelected((current) => {
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
        selectedTabIds: selected,
        settings: persisted.settings,
        tabs: inventory.tabs,
      });
      setResult(operation);
      setMessage(
        `Closed ${operation.closed.length} tab${operation.closed.length === 1 ? '' : 's'}. ${operation.failures.length} failed.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cleanup failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!persisted.state) {
      return;
    }
    setBusy(true);
    try {
      const undo = await undoLastCleanup(persisted.state);
      setMessage(`Restored ${undo.restored}. ${undo.messages.join(' ')}`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePark(tabs: InventoryTab[], closeAfter: boolean) {
    if (!persisted.state) {
      return;
    }
    await parkSelected(persisted.state, tabs, activeCollection, closeAfter);
    await persisted.reload();
    setMessage(`Parked ${tabs.length} tab${tabs.length === 1 ? '' : 's'}.`);
  }

  const plan = planCleanup(groups, selected, persisted.settings, inventory.tabs);

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
        {inventory.error ? <StatusBanner tone="danger">{inventory.error}</StatusBanner> : null}
        {persisted.error ? <StatusBanner tone="warn">{persisted.error}</StatusBanner> : null}
        {message ? <StatusBanner tone="info">{message}</StatusBanner> : null}

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
              <article className={styles.card}>
                <b>{summary.total}</b>
                Open tabs
              </article>
              <article className={styles.card}>
                <b>{inventory.counts.extraTabs}</b>
                Extra copies
              </article>
              <article className={styles.card}>
                <b>{summary.uniqueHosts}</b>
                Unique domains
              </article>
              <article className={styles.card}>
                <b>{persisted.state?.parkedEntries.length ?? 0}</b>
                Parked
              </article>
            </div>
            <div className={styles.grid} style={{ marginTop: 16 }}>
              <SearchBox tabs={inventory.tabs} windows={inventory.windows} onActivate={(tab) => void activateTab(tab)} />
              {inventory.counts.extraTabs === 0 ? (
                <EmptyState title="Nothing to clean up">No duplicate URLs were found in the current windows.</EmptyState>
              ) : (
                <StatusBanner tone="info">
                  Cleaning up now would close {plan.targets.length} tab{plan.targets.length === 1 ? '' : 's'} and keep one copy
                  of each group. Pinned and active tabs stay unless you change Settings.
                </StatusBanner>
              )}
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
              <Button onClick={() => setSelected(new Set(eligible))}>Select eligible</Button>
              <Button onClick={() => setSelected(new Set())}>Clear selection</Button>
              <Button variant="primary" disabled={plan.targets.length === 0 || busy} onClick={() => void handleCleanup()}>
                {busy ? 'Cleaning…' : `Close ${plan.targets.length} selected`}
              </Button>
              <Button disabled={busy} onClick={() => void handleUndo()}>
                Undo last cleanup
              </Button>
            </div>
            {groups.length === 0 ? (
              <EmptyState title="No duplicates found">Open the same URL twice to see a group here.</EmptyState>
            ) : (
              <div className={styles.grid}>
                {groups.map((group) => (
                  <DuplicateGroupCard
                    key={group.id}
                    group={group}
                    settings={persisted.settings}
                    selected={selected}
                    onToggle={toggle}
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
                <p>Search, filter, switch, or park tabs without leaving this page.</p>
              </div>
            </header>
            <div className={styles.toolbar}>
              <label className={styles.field}>
                Filter
                <select value={filter} onChange={(event) => setFilter(event.target.value as TabFilterKey)}>
                  <option value="all">All</option>
                  <option value="duplicated">Duplicated</option>
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
              <Button onClick={() => void handlePark(visibleTabs.filter((tab) => selected.has(tab.id)), true)}>
                Park selected
              </Button>
            </div>
            <SearchBox tabs={inventory.tabs} windows={inventory.windows} onActivate={(tab) => void activateTab(tab)} />
            {visibleTabs.length === 0 ? (
              <EmptyState title="No tabs match">Try another filter or wait for the inventory to load.</EmptyState>
            ) : (
              <div className={styles.grid} style={{ marginTop: 12 }}>
                {domainGroups
                  .map((group) => ({
                    ...group,
                    tabs: group.tabs.filter((tab) => visibleTabs.some((item) => item.id === tab.id)),
                  }))
                  .filter((group) => group.tabs.length > 0)
                  .map((group) => (
                    <section key={group.domain} className={styles.card}>
                      <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>
                        {group.label} · {group.tabs.length}
                      </h2>
                      {group.tabs.map((tab) => (
                        <TabRow
                          key={tab.id}
                          tab={tab}
                          windowLabel={windowLabel(tab.windowId)}
                          selected={selected.has(tab.id)}
                          onToggle={() => toggle(tab.id)}
                          onActivate={(item) => void activateTab(item)}
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
            styles={styles}
          />
        ) : null}

        {view === 'settings' ? (
          <SettingsView settings={persisted.settings} onSave={(next) => void persisted.saveSettings(next)} />
        ) : null}
      </main>
    </div>
  );
}

function ParkedView({
  view,
  persisted,
  parkQuery,
  setParkQuery,
  selectedParked,
  setSelectedParked,
  collectionName,
  setCollectionName,
  activeCollection,
  setActiveCollection,
  styles: scoped,
}: {
  view: DashboardView;
  persisted: ReturnType<typeof usePersistedState>;
  parkQuery: string;
  setParkQuery: (value: string) => void;
  selectedParked: Set<string>;
  setSelectedParked: (value: Set<string>) => void;
  collectionName: string;
  setCollectionName: (value: string) => void;
  activeCollection: string;
  setActiveCollection: (value: string) => void;
  styles: typeof styles;
}) {
  const entries = searchParked(persisted.state?.parkedEntries ?? [], parkQuery).filter((entry) =>
    view === 'collections' ? entry.collectionId === activeCollection : true,
  );
  const collections = persisted.state?.collections ?? [];

  return (
    <>
      <header className={scoped.heading}>
        <div>
          <h1>{view === 'collections' ? 'Collections' : 'Parked tabs'}</h1>
          <p>Saved locally. Restoring opens the original URL and may not recover page state.</p>
        </div>
      </header>
      <div className={scoped.toolbar}>
        <label className={scoped.field}>
          Search parked
          <input value={parkQuery} onChange={(event) => setParkQuery(event.target.value)} />
        </label>
        <label className={scoped.field}>
          Collection
          <select value={activeCollection} onChange={(event) => setActiveCollection(event.target.value)}>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={() => {
            const urls = entries.filter((entry) => selectedParked.has(entry.id) || selectedParked.size === 0).map((entry) => entry.url);
            void restoreParked(urls).then(async () => {
              if (persisted.settings.deleteParkedAfterRestore && persisted.state) {
                await persisted.update((state) =>
                  deleteParkedEntries(
                    state,
                    entries.filter((entry) => urls.includes(entry.url)).map((entry) => entry.id),
                  ),
                );
              }
            });
          }}
        >
          Restore
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!window.confirm('Delete the selected parked tabs? This cannot be undone.')) {
              return;
            }
            void persisted.update((state) => deleteParkedEntries(state, [...selectedParked]));
            setSelectedParked(new Set());
          }}
        >
          Delete selected
        </Button>
      </div>
      {view === 'collections' ? (
        <div className={scoped.toolbar}>
          <label className={scoped.field}>
            New collection
            <input value={collectionName} onChange={(event) => setCollectionName(event.target.value)} />
          </label>
          <Button
            onClick={() => {
              const created = createCollection(collectionName || 'Untitled collection');
              void persisted.update((state) => ({ ...state, collections: [...state.collections, created] }));
              setCollectionName('');
              setActiveCollection(created.id);
            }}
          >
            Create
          </Button>
          {SUGGESTED_COLLECTION_NAMES.map((name) => (
            <Button
              key={name}
              size="sm"
              variant="ghost"
              onClick={() => {
                const created = createCollection(name);
                void persisted.update((state) => ({ ...state, collections: [...state.collections, created] }));
              }}
            >
              {name}
            </Button>
          ))}
          {activeCollection !== INBOX_COLLECTION_ID ? (
            <>
              <Button
                onClick={() => {
                  const name = window.prompt('Rename collection', collections.find((item) => item.id === activeCollection)?.name);
                  if (!name) {
                    return;
                  }
                  void persisted.update((state) => renameCollection(state, activeCollection, name));
                }}
              >
                Rename
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!window.confirm('Delete this collection? Parked tabs move to Inbox.')) {
                    return;
                  }
                  void persisted.update((state) => deleteCollection(state, activeCollection));
                  setActiveCollection(INBOX_COLLECTION_ID);
                }}
              >
                Delete collection
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState title="No parked tabs">Park tabs from All tabs to save them locally for later.</EmptyState>
      ) : (
        <div className={scoped.grid}>
          {entries.map((entry) => (
            <label key={entry.id} className={scoped.card}>
              <input
                type="checkbox"
                checked={selectedParked.has(entry.id)}
                onChange={() => {
                  const next = new Set(selectedParked);
                  if (next.has(entry.id)) {
                    next.delete(entry.id);
                  } else {
                    next.add(entry.id);
                  }
                  setSelectedParked(next);
                }}
              />{' '}
              <strong>{entry.title}</strong>
              <div className={scoped.muted}>{entry.url}</div>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

function SettingsView({
  settings,
  onSave,
}: {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onSave(next);
  }

  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>Settings</h1>
          <p>All preferences stay on this browser. Restore defaults at any time.</p>
        </div>
        <Button onClick={() => onSave({ ...DEFAULT_SETTINGS })}>Restore defaults</Button>
      </header>
      <div className={styles.grid}>
        <label className={styles.field}>
          Duplicate matching
          <select value={draft.matchMode} onChange={(event) => update('matchMode', event.target.value as AppSettings['matchMode'])}>
            <option value="exact">Exact canonical URL</option>
            <option value="smart">Smart (ignore common tracking parameters)</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.stripTrackingParams}
            onChange={(event) => update('stripTrackingParams', event.target.checked)}
          />{' '}
          Strip known tracking parameters in smart mode
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.ignoreFragmentInSmartMode}
            onChange={(event) => update('ignoreFragmentInSmartMode', event.target.checked)}
          />{' '}
          Ignore URL fragments in smart mode
        </label>
        <label className={styles.field}>
          Extra tracking parameters (comma separated)
          <input
            value={draft.extraTrackingParams.join(', ')}
            onChange={(event) =>
              update(
                'extraTrackingParams',
                event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.protectPinned}
            onChange={(event) => update('protectPinned', event.target.checked)}
          />{' '}
          Protect pinned tabs
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.protectActive}
            onChange={(event) => update('protectActive', event.target.checked)}
          />{' '}
          Protect the active tab
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.protectLastTabInWindow}
            onChange={(event) => update('protectLastTabInWindow', event.target.checked)}
          />{' '}
          Do not close the last tab in a window
        </label>
        <label className={styles.field}>
          Duplicate awareness
          <select
            value={draft.duplicateNotice}
            onChange={(event) => update('duplicateNotice', event.target.value as AppSettings['duplicateNotice'])}
          >
            <option value="off">Off</option>
            <option value="badge">Badge only</option>
            <option value="banner">Popup banner and badge</option>
          </select>
        </label>
        <label className={styles.field}>
          Theme
          <select value={draft.theme} onChange={(event) => update('theme', event.target.value as AppSettings['theme'])}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className={styles.field}>
          Cleanup history size
          <input
            type="number"
            min={1}
            max={50}
            value={draft.cleanupHistoryLimit}
            onChange={(event) => update('cleanupHistoryLimit', Number(event.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.deleteParkedAfterRestore}
            onChange={(event) => update('deleteParkedAfterRestore', event.target.checked)}
          />{' '}
          Remove parked entries after restore
        </label>
        <label className={styles.field}>
          Default dashboard view
          <select
            value={draft.defaultDashboardView}
            onChange={(event) => update('defaultDashboardView', event.target.value as AppSettings['defaultDashboardView'])}
          >
            {NAV.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
