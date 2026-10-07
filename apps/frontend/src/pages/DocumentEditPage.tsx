import { DocumentTitleSchema } from '@cm/shared';
import { CheckCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useDocument, useForceSave, useUpdateDocument } from '../api/documents';
import { PageContent } from '../components/layout/PageContent';
import { PageFallback } from '../components/layout/PageFallback';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, EditableTitle, useToast } from '../components/ui';
import { OnlyOfficeEditor } from '../features/documents/OnlyOfficeEditor';
import { usePageTitle } from '../hooks/usePageTitle';
import { errorMessage } from '../lib/errors';

/** Bearbeiten im ONLYOFFICE-Editor; „Abschließen“ speichert sofort und führt zur Abschlussseite. */
export function DocumentEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: document, isPending, error } = useDocument(id);
  const update = useUpdateDocument(id);
  const forceSave = useForceSave(id);
  usePageTitle(document ? `${document.title} bearbeiten` : 'Dokument');

  if (!document) {
    return (
      <PageFallback
        title="Dokument"
        back="/documents"
        backLabel="Zur Dokumentliste"
        notFoundTitle="Dokument nicht gefunden"
        isPending={isPending}
        error={error}
      />
    );
  }

  function finish() {
    forceSave.mutate(undefined, {
      onSuccess: () => navigate(`/documents/${id}/finalize`),
      onError: (err) => toast.error(errorMessage(err)),
    });
  }

  return (
    <>
      <PageHeader
        back={`/documents/${id}`}
        title={
          <EditableTitle
            value={document.title}
            onSave={(title) => update.mutateAsync({ title: DocumentTitleSchema.parse(title) })}
          />
        }
        actions={
          <Button
            variant="primary"
            icon={<CheckCheck />}
            loading={forceSave.isPending}
            onClick={finish}
          >
            {forceSave.isPending ? 'Wird gespeichert …' : 'Abschließen'}
          </Button>
        }
      />
      <PageContent width="full">
        <OnlyOfficeEditor documentId={id} mode="edit" />
      </PageContent>
    </>
  );
}
