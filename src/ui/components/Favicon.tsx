import { useState } from 'react';
import styles from './Favicon.module.css';

interface FaviconProps {
  src: string | null;
  title: string | null;
}

export function Favicon({ src, title }: FaviconProps) {
  const [failed, setFailed] = useState(false);
  const letter = (title || '?').trim().charAt(0).toUpperCase() || '?';
  if (!src || failed) {
    return (
      <span className={styles.fallback} aria-hidden="true">
        {letter}
      </span>
    );
  }
  return <img className={styles.icon} src={src} alt="" onError={() => setFailed(true)} />;
}
