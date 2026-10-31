import type { ReactNode } from 'react';
import { cx } from '../../shared/cx';
import styles from './StatusBanner.module.css';

interface StatusBannerProps {
  tone?: 'info' | 'success' | 'warn' | 'danger';
  children: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
}

export function StatusBanner({ tone = 'info', children, actions, onDismiss }: StatusBannerProps) {
  return (
    <div className={cx(styles.banner, styles[tone])} role="status" aria-live="polite">
      <p className={styles.body}>{children}</p>
      {actions || onDismiss ? (
        <div className={styles.actions}>
          {actions}
          {onDismiss ? (
            <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
              ×
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
