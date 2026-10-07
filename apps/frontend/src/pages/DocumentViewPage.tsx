import { Pencil, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useDeleteDocument, useDocument } from '../api/documents';
import { PageContent } from '../components/layout/PageContent';
import { PageFallback } from '../components/layout/PageFallback';
import { PageHeader } from '../components/layout/PageHeader';
import { ButtonLink, ConfirmDialog, IconButton, useToast } from '../components/ui';
import { DocumentMeta } from '../features/documents/DocumentMeta';
import { OnlyOfficeEditor } from '../features/documents/OnlyOfficeEditor';
import { usePageTitle } from '../hooks/usePageTitle';

/** Schreibgeschützte Ansicht (Kap. 7.4.7). */
export function DocumentViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: document, isPending, error } = useDocument(id);
  const remove = useDeleteDocument();
  const [confirmDelete, setConfirmDelete] = useState(false);
  usePageTitle(document?.title ?? 'Dokument');

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

  return (
    <>
      <PageHeader
        back="/documents"
        title={document.title}
        actions={
          <>
            <IconButton
              icon={<Trash2 />}
              label="Dokument löschen"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            />
            <ButtonLink to={`/documents/${id}/finalize`} icon={<Send />}>
              Abschluss & Versand
            </ButtonLink>
            <ButtonLink to={`/documents/${id}/edit`} variant="primary" icon={<Pencil />}>
              Bearbeiten
            </ButtonLink>
          </>
        }
      />
      <DocumentMeta document={document} />
      <PageContent width="full">
        <OnlyOfficeEditor source={{ kind: 'document', id }} mode="view" />
      </PageContent>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Dokument löschen?"
        message={`„${document.title}“ endgültig löschen? DOCX, PDF und Versandhistorie werden entfernt.`}
        confirmLabel="Löschen"
        danger
        onConfirm={async () => {
          await remove.mutateAsync(id);
          toast.success('Dokument gelöscht.');
          navigate('/documents');
        }}
      />
    </>
  );
}
