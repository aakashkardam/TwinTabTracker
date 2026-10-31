import { useRef, useState } from 'react';
import { SUGGESTED_COLLECTION_NAMES } from '../shared/copy';
import { exportParkedData, mergeParkedImport, parseParkedExport } from '../shared/park/export';
import {
  createCollection,
  deleteCollection,
  deleteParkedEntries,
  INBOX_COLLECTION_ID,
  renameCollection,
  searchParked,
} from '../shared/park/operations';
import type { DashboardView } from '../shared/types';
import { restoreParkedEntries } from '../ui/actions';
import { Button } from '../ui/components/Button';
import { ConfirmBar } from '../ui/components/ConfirmBar';
import { EmptyState } from '../ui/components/EmptyState';
import { ParkedRow } from '../ui/components/ParkedRow';
import { StatusBanner } from '../ui/components/StatusBanner';
import { usePersistedState } from '../ui/hooks/useSettings';
import styles from './DashboardApp.module.css';

export function ParkedView({
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
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<'entries' | 'collection' | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const entries = searchParked(persisted.state?.parkedEntries ?? [], parkQuery).filter((entry) =>
    view === 'collections' ? entry.collectionId === activeCollection : true,
  );
  const collections = persisted.state?.collections ?? [];
  const selectedEntries = entries.filter((entry) => selectedParked.has(entry.id));
  const activeName = collections.find((item) => item.id === activeCollection)?.name ?? 'Inbox';

  async function openEntries(ids: string[]) {
    const targets = entries.filter((entry) => ids.includes(entry.id));
    if (targets.length === 0) {
      return;
    }
    await restoreParkedEntries(targets, persisted.settings.deleteParkedAfterRestore);
    if (persisted.settings.deleteParkedAfterRestore) {
      setSelectedParked(new Set());
      await persisted.reload();
    }
  }

  async function handleExport() {
    if (!persisted.state) {
      return;
    }
    const payload = exportParkedData(persisted.state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'twintabtracker-parked.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    try {
      const parsed = parseParkedExport(await file.text());
      if (!parsed) {
        setImportMessage('That file is not a TwinTabTracker parked-tabs export.');
        return;
      }
      await persisted.update((state) => mergeParkedImport(state, parsed));
      setImportMessage(`Imported ${parsed.parkedEntries.length} parked tab${parsed.parkedEntries.length === 1 ? '' : 's'}.`);
    } catch {
      setImportMessage('Could not read that file.');
    }
  }

  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>{view === 'collections' ? 'Collections' : 'Parked tabs'}</h1>
          <p>Click a parked tab to open it. Parking saves the URL locally and closes the live tab.</p>
        </div>
      </header>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          Search parked
          <input value={parkQuery} onChange={(event) => setParkQuery(event.target.value)} />
        </label>
        <label className={styles.field}>
          Collection
          <select
            value={activeCollection}
            onChange={(event) => {
              setActiveCollection(event.target.value);
              setPending(null);
              setRenaming(false);
              setCreating(false);
            }}
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          disabled={selectedEntries.length === 0}
          onClick={() => void openEntries(selectedEntries.map((entry) => entry.id))}
        >
          Open selected
        </Button>
        <Button variant="danger" disabled={selectedParked.size === 0} onClick={() => setPending('entries')}>
          Delete selected
        </Button>
        <Button onClick={() => void handleExport()}>Export</Button>
        <Button onClick={() => fileInput.current?.click()}>Import</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImport(file);
            }
            event.target.value = '';
          }}
        />
      </div>
      {pending === 'entries' ? (
        <ConfirmBar
          message="Delete the selected parked tabs? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => {
            void persisted.update((state) => deleteParkedEntries(state, [...selectedParked]));
            setSelectedParked(new Set());
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
      {importMessage ? (
        <StatusBanner tone="info" onDismiss={() => setImportMessage(null)}>
          {importMessage}
        </StatusBanner>
      ) : null}
      {view === 'collections' && pending !== 'collection' ? (
        <div className={styles.collectionBar}>
          <div className={styles.toolbar}>
            {renaming ? (
              <>
                <label className={styles.field}>
                  Rename {activeName}
                  <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                </label>
                <Button
                  onClick={() => {
                    void persisted.update((state) => renameCollection(state, activeCollection, renameValue));
                    setRenaming(false);
                  }}
                >
                  Save name
                </Button>
                <Button variant="ghost" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </>
            ) : creating ? (
              <>
                <label className={styles.field}>
                  New collection
                  <input value={collectionName} onChange={(event) => setCollectionName(event.target.value)} />
                </label>
                <Button
                  onClick={() => {
                    const created = createCollection(collectionName || 'Untitled collection');
                    void persisted.update((state) => ({ ...state, collections: [...state.collections, created] }));
                    setCollectionName('');
                    setActiveCollection(created.id);
                    setCreating(false);
                  }}
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setCollectionName('');
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {activeCollection !== INBOX_COLLECTION_ID ? (
                  <>
                    <Button
                      onClick={() => {
                        setRenameValue(activeName);
                        setRenaming(true);
                      }}
                    >
                      Rename
                    </Button>
                    <Button variant="danger" onClick={() => setPending('collection')}>
                      Delete collection
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCreating(true);
                    setRenaming(false);
                  }}
                >
                  New collection
                </Button>
              </>
            )}
          </div>
          {creating
            ? SUGGESTED_COLLECTION_NAMES.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const created = createCollection(name);
                    void persisted.update((state) => ({ ...state, collections: [...state.collections, created] }));
                    setActiveCollection(created.id);
                    setCreating(false);
                  }}
                >
                  {name}
                </Button>
              ))
            : null}
        </div>
      ) : null}
      {pending === 'collection' ? (
        <ConfirmBar
          message={`Delete “${activeName}”? Parked tabs move to Inbox.`}
          confirmLabel="Delete collection"
          onConfirm={() => {
            void persisted.update((state) => deleteCollection(state, activeCollection));
            setActiveCollection(INBOX_COLLECTION_ID);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
      {entries.length === 0 ? (
        <EmptyState title="No parked tabs">
          Park the current tab from the toolbar popup, right-click a tab and choose Park this tab, or use Park on All
          tabs.
        </EmptyState>
      ) : (
        <div className={styles.listPanel}>
          {entries.map((entry) => (
            <ParkedRow
              key={entry.id}
              entry={entry}
              selected={selectedParked.has(entry.id)}
              onToggle={() => {
                const next = new Set(selectedParked);
                if (next.has(entry.id)) {
                  next.delete(entry.id);
                } else {
                  next.add(entry.id);
                }
                setSelectedParked(next);
              }}
              onOpen={(item) => void openEntries([item.id])}
            />
          ))}
        </div>
      )}
    </>
  );
}
