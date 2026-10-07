import { Check, FileX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useForceSaveTemplate, useTemplate } from '../api/templates';
import { PageContent } from '../components/layout/PageContent';
import { PageFallback } from '../components/layout/PageFallback';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, ButtonLink, EmptyState, useToast } from '../components/ui';
import { OnlyOfficeEditor } from '../features/documents/OnlyOfficeEditor';
import { usePageTitle } from '../hooks/usePageTitle';
import { errorMessage } from '../lib/errors';

/** Vorlageninhalt im ONLYOFFICE-Editor; „Fertig“ speichert sofort und prüft die Platzhalter (Kap. 14.7). */
export function TemplateContentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: template, isPending, error } = useTemplate(id);
  const forceSave = useForceSaveTemplate(id);
  const back = `/documents/templates/${id}`;
  usePageTitle(template ? `Inhalt: ${template.name}` : 'Vorlage');

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

  function finish() {
    forceSave.mutate(undefined, {
      onSuccess: (saved) => {
        if (saved.content.error) toast.show(saved.content.error, 'info');
        else toast.success('Vorlageninhalt gespeichert.');
        navigate(back);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  }

  return (
    <>
      <PageHeader
        back={back}
        title={`Inhalt: ${template.name}`}
        actions={
          template.content.exists && (
            <Button
              variant="primary"
              icon={<Check />}
              loading={forceSave.isPending}
              onClick={finish}
            >
              {forceSave.isPending ? 'Wird gespeichert …' : 'Fertig'}
            </Button>
          )
        }
      />
      <PageContent width="full">
        {template.content.exists ? (
          <OnlyOfficeEditor source={{ kind: 'template', id }} mode="edit" />
        ) : (
          <EmptyState
            icon={<FileX />}
            title="Diese Vorlage hat noch keinen Inhalt"
            description="Lege den Inhalt in der Vorlage an oder lade eine DOCX hoch."
            action={<ButtonLink to={back}>Zur Vorlage</ButtonLink>}
          />
        )}
      </PageContent>
    </>
  );
}
