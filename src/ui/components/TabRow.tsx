import type { ReactNode } from 'react';
import { cx } from '../../shared/cx';
import type { InventoryTab } from '../../shared/types';
import { displayHost } from '../../shared/url/hostname';
import { Favicon } from './Favicon';
import styles from './TabRow.module.css';

interface TabRowProps {
  tab: InventoryTab;
  windowLabel?: string;
  selected?: boolean;
  keep?: boolean;
  onActivate?: (tab: InventoryTab) => void;
  onToggle?: (tab: InventoryTab) => void;
  disabled?: boolean;
  trailing?: ReactNode;
}

export function TabRow({
  tab,
  windowLabel,
  selected,
  keep,
  onActivate,
  onToggle,
  disabled,
  trailing,
}: TabRowProps) {
  const title = tab.title || tab.url || 'Untitled tab';
  const host = displayHost(tab.url);

  const badges = (
    <span className={styles.badges}>
      {keep ? <span className={cx(styles.badge, styles.keep)}>Keep</span> : null}
      {tab.active ? <span className={cx(styles.badge, styles.active)}>Active</span> : null}
      {tab.pinned ? <span className={styles.badge}>Pinned</span> : null}
      {onActivate && onToggle ? (
        <button type="button" className={styles.switch} onClick={() => onActivate(tab)}>
          Switch
        </button>
      ) : null}
      {trailing}
    </span>
  );

  const meta = (
    <span className={styles.meta}>
      <span className={styles.title}>{title}</span>
      <span className={styles.url}>
        {host}
        {windowLabel ? ` · ${windowLabel}` : ''}
        {tab.restricted ? ' · Restricted' : ''}
      </span>
    </span>
  );

  if (onActivate && !onToggle) {
    return (
      <button type="button" className={styles.row} onClick={() => onActivate(tab)}>
        <span className={styles.check} />
        <Favicon src={tab.favIconUrl} title={title} />
        {meta}
        {badges}
      </button>
    );
  }

  return (
    <div className={cx(styles.row, styles.plain)}>
      <span className={styles.check}>
        {onToggle ? (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            disabled={disabled || keep}
            onChange={() => onToggle(tab)}
            aria-label={keep ? 'Kept tab' : `Select ${title}`}
          />
        ) : null}
      </span>
      <Favicon src={tab.favIconUrl} title={title} />
      {meta}
      {badges}
    </div>
  );
}
