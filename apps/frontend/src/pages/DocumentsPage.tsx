import { FileText, Plus, Settings } from 'lucide-react';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, EmptyState, IconButton } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export function DocumentsPage() {
  usePageTitle('Dokumente');

  return (
    <>
      <PageHeader
        title="Dokumente"
        actions={
          <>
            {/* Anlegen folgt mit Meilenstein 4 */}
            <Button variant="primary" icon={<Plus />} disabled>
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
        <Card>
          <EmptyState
            icon={<FileText />}
            title="Noch keine Dokumente"
            description="Hier erscheinen die gespeicherten Dokumente, neueste zuerst."
          />
        </Card>
      </PageContent>
    </>
  );
}
