import type { ReactNode } from 'react';
import { cx } from '../../shared/cx';
import styles from './StatusBanner.module.css';

interface StatusBannerProps {
  tone?: 'info' | 'success' | 'warn' | 'danger';
  children: ReactNode;
  actions?: ReactNode;
}

export function StatusBanner({ tone = 'info', children, actions }: StatusBannerProps) {
  return (
    <div className={cx(styles.banner, styles[tone])} role="status">
      <p className={styles.body}>{children}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
