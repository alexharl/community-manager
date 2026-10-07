import { Chip } from './Chip';
import styles from './TagFilterBar.module.css';

interface TagFilterBarProps {
  tags: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Tags als Umschalter; mehrere gewählte Tags werden ODER-verknüpft (Kap. 5.5). */
export function TagFilterBar({ tags, selected, onChange }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className={styles.bar} role="group" aria-label="Nach Tags filtern">
      {tags.map((tag) => {
        const pressed = selected.some((value) => same(value, tag));
        return (
          <Chip
            key={tag}
            pressed={pressed}
            onToggle={() =>
              onChange(pressed ? selected.filter((value) => !same(value, tag)) : [...selected, tag])
            }
          >
            {tag}
          </Chip>
        );
      })}
    </div>
  );
}
