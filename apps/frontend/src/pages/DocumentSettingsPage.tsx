import { LayoutTemplate, Plus } from 'lucide-react';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, EmptyState, IconButton } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export function DocumentSettingsPage() {
  usePageTitle('Dokument-Einstellungen');

  return (
    <>
      <PageHeader back="/documents" title="Dokument-Einstellungen" />
      <PageContent>
        <Card
          title="Vorlagen"
          padded={false}
          // Anlegen folgt mit Meilenstein 3
          actions={<IconButton icon={<Plus />} label="Neue Vorlage" disabled />}
        >
          <EmptyState icon={<LayoutTemplate />} title="Noch keine Vorlagen" />
        </Card>
      </PageContent>
    </>
  );
}
