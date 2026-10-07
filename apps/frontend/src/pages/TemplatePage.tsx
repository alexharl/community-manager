import { useParams } from 'react-router';
import { useTemplate } from '../api/templates';
import { PageFallback } from '../components/layout/PageFallback';
import { TemplateEditor } from '../features/templates/TemplateEditor';
import { usePageTitle } from '../hooks/usePageTitle';

export function TemplatePage() {
  const { id = '' } = useParams();
  const { data: template, isPending, error } = useTemplate(id);
  usePageTitle(template?.name ?? 'Vorlage');

  if (!template) {
    return (
      <PageFallback
        title="Vorlage"
        back="/documents/settings"
        backLabel="Zu den Vorlagen"
        notFoundTitle="Vorlage nicht gefunden"
        isPending={isPending}
        error={error}
      />
    );
  }
  return <TemplateEditor key={template.id} template={template} />;
}
