import type { SnippetPart } from '@cm/shared';
import styles from './SearchSnippet.module.css';

/** Textstelle eines Suchtreffers; gefundene Wörter hervorgehoben (Kap. 7.4.3). */
export function SearchSnippet({ parts }: { parts: SnippetPart[] }) {
  return (
    <span className={styles.snippet}>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className={styles.match}>
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </span>
  );
}
