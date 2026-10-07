import type { DocumentDetail, DocumentPatch } from '@cm/shared';
import { Check, Mail, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useDocument, useUpdateDocument } from '../api/documents';
import { TagInput } from '../components/chips';
import { PageContent } from '../components/layout/PageContent';
import { PageFallback } from '../components/layout/PageFallback';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, ButtonLink, Card, SaveStatus, Stack, Text } from '../components/ui';
import { DispatchSection } from '../features/dispatch/DispatchSection';
import { templateLabel } from '../features/documents/labels';
import { PdfStatusItem } from '../features/documents/PdfStatusItem';
import { usePdfStatus } from '../features/documents/usePdfStatus';
import { applyMailPatch, type MailPatch } from '../features/mail/mailPatch';
import { useAutosave } from '../hooks/useAutosave';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDateTime } from '../lib/format';

/** Abschlussseite: Dokumentinfo, Tags, PDF und Mailversand (Kap. 7.4.8). */
export function DocumentFinalizePage() {
  const { id = '' } = useParams();
  // Bei jedem Fensterfokus neu laden: geänderte Version → PDF wird neu erzeugt
  const { data: document, isPending, error } = useDocument(id, { alwaysFresh: true });
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
  const pdf = usePdfStatus(document);
  // Lokaler Zustand, damit Autosave-Antworten die Eingabe nicht überschreiben
  const [tags, setTags] = useState(document.tags);
  const [mail, setMail] = useState(document.mail);

  function changeMail(patch: MailPatch) {
    setMail((current) => applyMailPatch(current, patch));
    autosave.saveNow({ mail: patch });
  }

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
            <Stack gap={2}>
              <Text tone="muted" size="sm">
                Version {document.version} · zuletzt bearbeitet {formatDateTime(document.editedAt)}
              </Text>
              <PdfStatusItem
                state={pdf.state}
                pdf={document.pdf}
                title={document.title}
                href={pdf.href}
                error={pdf.error}
                onRetry={pdf.retry}
              />
            </Stack>
          </Stack>
        </Card>

        {mail.enabled ? (
          <DispatchSection
            document={document}
            mail={mail}
            onMailChange={changeMail}
            configSaving={autosave.state === 'saving'}
            pdfReady={pdf.state === 'ready'}
          />
        ) : (
          // Entscheidung A6: Mailversand auch ohne Vorlage nachträglich möglich
          <Card title="Mailversand">
            <Stack gap={3} align="flex-start">
              <Text tone="muted" size="sm">
                Für dieses Dokument ist kein Mailversand eingerichtet.
              </Text>
              <Button icon={<Mail />} onClick={() => changeMail({ enabled: true })}>
                Mailversand hinzufügen
              </Button>
            </Stack>
          </Card>
        )}
      </PageContent>
    </>
  );
}
