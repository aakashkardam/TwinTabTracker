import type { AppSettings, DuplicateGroup, InventoryTab, TabId } from '../../shared/types';
import { Button } from './Button';
import { TabRow } from './TabRow';
import styles from './DuplicateGroupCard.module.css';

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  settings: AppSettings;
  selected: Set<TabId>;
  onToggle: (tabId: TabId) => void;
  onKeep: (groupId: string, tabId: TabId) => void;
  onActivate: (tab: InventoryTab) => void;
  windowLabel: (windowId: number) => string;
}

export function DuplicateGroupCard({
  group,
  settings,
  selected,
  onToggle,
  onKeep,
  onActivate,
  windowLabel,
}: DuplicateGroupCardProps) {
  return (
    <section className={styles.card} aria-label={`Duplicate group with ${group.copyCount} copies`}>
      <header className={styles.head}>
        <p className={styles.key}>{group.comparisonKey}</p>
        <span className={styles.count}>{group.copyCount} copies</span>
      </header>
      <div className={styles.list}>
        {group.members.map((tab) => {
          const keep = tab.id === group.keepTabId;
          const protectedTab =
            keep ||
            (settings.protectPinned && tab.pinned) ||
            (settings.protectActive && tab.active) ||
            tab.restricted;
          return (
            <div key={tab.id}>
              <TabRow
                tab={tab}
                windowLabel={windowLabel(tab.windowId)}
                keep={keep}
                selected={selected.has(tab.id)}
                disabled={protectedTab}
                onToggle={() => onToggle(tab.id)}
                trailing={
                  keep ? null : (
                    <Button size="sm" variant="ghost" onClick={() => onKeep(group.id, tab.id)}>
                      Keep this
                    </Button>
                  )
                }
              />
              <span className="sr-only">
                <button type="button" onClick={() => onActivate(tab)}>
                  Switch to {tab.title ?? tab.url}
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {group.warnings.includes('cross-window') ? (
        <p className={styles.warn}>These copies are spread across multiple windows.</p>
      ) : null}
    </section>
  );
}
