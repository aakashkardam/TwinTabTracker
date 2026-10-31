import { cx } from '../../shared/cx';
import type { ParkedEntry } from '../../shared/types';
import { Favicon } from './Favicon';
import styles from './ParkedRow.module.css';

interface ParkedRowProps {
  entry: ParkedEntry;
  selected?: boolean;
  onToggle?: (entry: ParkedEntry) => void;
  onOpen: (entry: ParkedEntry) => void;
}

export function ParkedRow({ entry, selected, onToggle, onOpen }: ParkedRowProps) {
  const title = entry.title || entry.url;

  return (
    <div className={cx(styles.row, !onToggle && styles.compact, selected && styles.selected)}>
      {onToggle ? (
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={() => onToggle(entry)}
          aria-label={`Select ${title}`}
        />
      ) : null}
      <button type="button" className={styles.open} onClick={() => onOpen(entry)}>
        <Favicon src={entry.favIconUrl} title={title} />
        <span className={styles.meta}>
          <span className={styles.title}>{title}</span>
          <span className={styles.url}>{entry.url}</span>
        </span>
      </button>
    </div>
  );
}
