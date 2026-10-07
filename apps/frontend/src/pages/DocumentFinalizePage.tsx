import type { DocumentDetail, DocumentPatch } from '@cm/shared';
import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useDocument, useUpdateDocument } from '../api/documents';
import { TagInput } from '../components/chips';
import { PageContent } from '../components/layout/PageContent';
import { PageFallback } from '../components/layout/PageFallback';
import { PageHeader } from '../components/layout/PageHeader';
import { ButtonLink, Card, SaveStatus, Stack, Text } from '../components/ui';
import { templateLabel } from '../features/documents/labels';
import { useAutosave } from '../hooks/useAutosave';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDateTime } from '../lib/format';

/** Abschlussseite (Kap. 7.4.8). PDF-Erzeugung und Mailversand folgen in Meilenstein 6 und 7. */
export function DocumentFinalizePage() {
  const { id = '' } = useParams();
  const { data: document, isPending, error } = useDocument(id);
  usePageTitle(document ? `${document.title} abschließen` : 'Dokument');

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
  return <FinalizeView key={document.id} document={document} />;
}

function FinalizeView({ document }: { document: DocumentDetail }) {
  const update = useUpdateDocument(document.id);
  const autosave = useAutosave((patch: DocumentPatch) => update.mutateAsync(patch));
  // Lokaler Zustand, damit Autosave-Antworten die Eingabe nicht überschreiben
  const [tags, setTags] = useState(document.tags);

  return (
    <>
      <PageHeader
        back={`/documents/${document.id}`}
        title={document.title}
        status={<SaveStatus state={autosave.state} error={autosave.error} />}
        actions={
          <>
            <ButtonLink to={`/documents/${document.id}/edit`} icon={<Pencil />}>
              Bearbeiten
            </ButtonLink>
            <ButtonLink to="/documents" variant="primary" icon={<Check />}>
              Fertig
            </ButtonLink>
          </>
        }
      />
      <PageContent>
        <Card title="Dokument">
          <Stack gap={4}>
            <Stack gap={1}>
              <Text strong>{document.title}</Text>
              <Text tone="muted" size="sm">
                Vorlage: {templateLabel(document)}
              </Text>
            </Stack>
            <TagInput
              label="Tags"
              value={tags}
              onChange={(value) => {
                setTags(value);
                autosave.saveNow({ tags: value });
              }}
            />
            <Text tone="muted" size="sm">
              Version {document.version} · zuletzt bearbeitet {formatDateTime(document.editedAt)}
            </Text>
          </Stack>
        </Card>
      </PageContent>
    </>
  );
}
