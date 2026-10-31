import { useState } from 'react';
import { TOUR_STEPS } from '../../shared/copy';
import { Button } from './Button';
import styles from './ProductTour.module.css';

export function ProductTour({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  if (!step) {
    return null;
  }

  const last = index === TOUR_STEPS.length - 1;

  return (
    <section className={styles.card} aria-label="First-run tour">
      <p className={styles.step}>
        Step {index + 1} of {TOUR_STEPS.length}
      </p>
      <h3 className={styles.title}>{step.title}</h3>
      <p className={styles.body}>{step.body}</p>
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" onClick={onFinish}>
          Skip
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            if (last) {
              onFinish();
              return;
            }
            setIndex((current) => current + 1);
          }}
        >
          {last ? 'Done' : 'Next'}
        </Button>
      </div>
    </section>
  );
}
