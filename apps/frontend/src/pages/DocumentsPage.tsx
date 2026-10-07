import { FileText, Plus, Settings, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useDocuments } from '../api/documents';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, EmptyState, IconButton, List, LoadingState } from '../components/ui';
import { DocumentListItem } from '../features/documents/DocumentListItem';
import { NewDocumentDialog } from '../features/documents/NewDocumentDialog';
import { usePageTitle } from '../hooks/usePageTitle';
import { errorMessage } from '../lib/errors';

export function DocumentsPage() {
  usePageTitle('Dokumente');
  const { data, isPending, error } = useDocuments();
  const [creating, setCreating] = useState(false);

  let content;
  if (isPending) {
    content = <LoadingState />;
  } else if (error) {
    content = (
      <EmptyState
        icon={<TriangleAlert />}
        title="Dokumente konnten nicht geladen werden"
        description={errorMessage(error)}
      />
    );
  } else if (data.items.length === 0) {
    content = (
      <EmptyState
        icon={<FileText />}
        title="Noch keine Dokumente"
        description="Hier erscheinen die gespeicherten Dokumente, neueste zuerst."
        action={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            Neues Dokument
          </Button>
        }
      />
    );
  } else {
    content = (
      <List>
        {data.items.map((document) => (
          <DocumentListItem key={document.id} document={document} />
        ))}
      </List>
    );
  }

  return (
    <>
      <PageHeader
        title="Dokumente"
        actions={
          <>
            <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
              Neues Dokument
            </Button>
            <IconButton
              to="/documents/settings"
              icon={<Settings />}
              label="Dokument-Einstellungen"
            />
          </>
        }
      />
      <PageContent>
        <Card padded={false}>{content}</Card>
      </PageContent>
      <NewDocumentDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
