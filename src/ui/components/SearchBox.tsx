import { useMemo, useState } from 'react';
import { searchTabs } from '../../shared/search/filter';
import type { InventoryTab } from '../../shared/types';
import { TabRow } from './TabRow';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
  tabs: InventoryTab[];
  windows: Array<{ id: number; title: string | null }>;
  onActivate: (tab: InventoryTab) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export function SearchBox({
  tabs,
  windows,
  onActivate,
  autoFocus,
  placeholder = 'Search open tabs',
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(true);
  const results = useMemo(() => searchTabs(tabs, query), [tabs, query]);
  const visible = open && query.trim() ? results : [];

  const windowLabel = (windowId: number): string => {
    const match = windows.find((window) => window.id === windowId);
    const index = windows.findIndex((window) => window.id === windowId);
    return match?.title ? `Window: ${match.title}` : `Window ${index + 1}`;
  };

  return (
    <div
      className={styles.wrap}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          window.setTimeout(() => setOpen(false), 120);
        }
      }}
      onFocus={() => setOpen(true)}
    >
      <span className={styles.icon} aria-hidden="true">
        ⌕
      </span>
      <input
        className={styles.input}
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, Math.max(0, visible.length - 1)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            const item = visible[active];
            if (item) {
              onActivate(item.tab);
            }
          } else if (event.key === 'Escape') {
            setQuery('');
          }
        }}
      />
      {open && query.trim() ? (
        visible.length === 0 ? (
          <p role="status">No matching tabs.</p>
        ) : (
          <ul className={styles.list} role="listbox" aria-label="Search results">
            {visible.slice(0, 40).map((result, index) => (
              <li
                key={result.tab.id}
                className={styles.item}
                role="option"
                aria-selected={index === active}
              >
                <TabRow
                  tab={result.tab}
                  windowLabel={windowLabel(result.tab.windowId)}
                  onActivate={onActivate}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
