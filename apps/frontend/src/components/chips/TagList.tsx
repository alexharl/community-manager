import { cx } from '../../lib/cx';
import { Chip } from './Chip';
import styles from './TagList.module.css';

/** Schreibgeschützte Chip-Reihe; inline nutzbar (z. B. in ListItem-Untertiteln). */
export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <span className={cx(styles.list, className)}>
      {tags.map((tag) => (
        <Chip key={tag}>{tag}</Chip>
      ))}
    </span>
  );
}
