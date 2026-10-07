import type { DocumentSummary } from '@cm/shared';
import { FileText } from 'lucide-react';
import { TagList } from '../../components/chips';
import { ListItem } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { templateLabel } from './labels';

export function DocumentListItem({ document }: { document: DocumentSummary }) {
  return (
    <ListItem
      icon={<FileText />}
      title={document.title}
      to={`/documents/${document.id}`}
      subtitle={
        <>
          <span>{templateLabel(document)}</span>
          <TagList tags={document.tags} />
        </>
      }
      meta={formatDate(document.createdAt)}
    />
  );
}
