import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  children: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{children}</p>
    </div>
  );
}
