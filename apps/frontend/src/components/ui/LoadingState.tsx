import styles from './LoadingState.module.css';
import { Spinner } from './Spinner';

/** Zentrierter Ladehinweis für Karten und Seiten. */
export function LoadingState({ label = 'Lädt …' }: { label?: string }) {
  return (
    <div className={styles.loading} role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
