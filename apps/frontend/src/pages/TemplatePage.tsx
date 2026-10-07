import { SearchX } from 'lucide-react';
import { useParams } from 'react-router';
import { ApiError } from '../api/client';
import { useTemplate } from '../api/templates';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import { ButtonLink, Card, EmptyState, LoadingState } from '../components/ui';
import { TemplateEditor } from '../features/templates/TemplateEditor';
import { usePageTitle } from '../hooks/usePageTitle';
import { errorMessage } from '../lib/errors';

export function TemplatePage() {
  const { id = '' } = useParams();
  const { data: template, isPending, error } = useTemplate(id);
  usePageTitle(template?.name ?? 'Vorlage');

  if (template) return <TemplateEditor key={template.id} template={template} />;

  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <>
      <PageHeader back="/documents/settings" title="Vorlage" />
      <PageContent>
        <Card>
          {isPending ? (
            <LoadingState />
          ) : (
            <EmptyState
              icon={<SearchX />}
              title={notFound ? 'Vorlage nicht gefunden' : 'Vorlage konnte nicht geladen werden'}
              description={notFound ? 'Sie wurde möglicherweise gelöscht.' : errorMessage(error)}
              action={<ButtonLink to="/documents/settings">Zu den Vorlagen</ButtonLink>}
            />
          )}
        </Card>
      </PageContent>
    </>
  );
}
