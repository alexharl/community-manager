import type { DocumentDetail } from '@cm/shared';
import { TagList } from '../../components/chips';
import { formatDateTime } from '../../lib/format';
import styles from './DocumentMeta.module.css';
import { templateLabel } from './labels';

/** Schmale Infozeile unter dem Seitenkopf: Vorlage · Tags · Version · Bearbeitungsdatum. */
export function DocumentMeta({ document }: { document: DocumentDetail }) {
  return (
    <div className={styles.meta}>
      <span>{templateLabel(document)}</span>
      <TagList tags={document.tags} />
      <span className={styles.push}>
        Version {document.version} · bearbeitet {formatDateTime(document.editedAt)}
      </span>
    </div>
  );
}
