import { TEMPLATE_CONTENT_MAX_BYTES, type Template } from '@cm/shared';
import { CalendarDays, CircleCheck, Eye, FilePen, TriangleAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  fetchTemplatePreview,
  useCreateTemplateContent,
  useUploadTemplateContent,
} from '../../api/templates';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  StatusBadge,
  Text,
  useToast,
} from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import { PlaceholderHelp } from './PlaceholderHelp';
import styles from './TemplateContentSection.module.css';

const DOCX_ACCEPT = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Vorlageninhalt (smarte Vorlagen, Kap. 14.7): anlegen oder hochladen, bearbeiten, Vorschau,
 * Prüfergebnis und Platzhalter-Hilfe.
 */
export function TemplateContentSection({ template }: { template: Template }) {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateTemplateContent(template.id);
  const upload = useUploadTemplateContent(template.id);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { content } = template;
  const editPath = `/documents/templates/${template.id}/content`;

  function design() {
    create.mutate(undefined, {
      onSuccess: () => navigate(editPath),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (file.size > TEMPLATE_CONTENT_MAX_BYTES) {
      toast.error('Die Vorlage darf höchstens 10 MB groß sein.');
      return;
    }
    // Vorhandenen Inhalt nur nach Rückfrage ersetzen
    if (content.exists) setPendingFile(file);
    else uploadFile(file);
  }

  async function uploadFile(file: File) {
    try {
      const saved = await upload.mutateAsync(file);
      if (saved.content.error) toast.show(saved.content.error, 'info');
      else toast.success('Vorlageninhalt hochgeladen.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function openPreview() {
    // Fenster sofort öffnen – nach der Wartezeit würde der Browser das Pop-up blockieren
    const preview = window.open('', '_blank');
    if (!preview) {
      toast.error('Das Vorschaufenster wurde blockiert. Bitte Pop-ups für diese Seite erlauben.');
      return;
    }
    preview.document.title = 'Vorschau';
    preview.document.body.textContent = 'Vorschau wird erstellt …';
    setPreviewing(true);
    try {
      const url = URL.createObjectURL(await fetchTemplatePreview(template.id));
      preview.location.replace(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      preview.close();
      toast.error(errorMessage(error));
    } finally {
      setPreviewing(false);
    }
  }

  const uploadButton = (
    <Button
      variant={content.exists ? 'ghost' : 'secondary'}
      icon={<Upload />}
      loading={upload.isPending}
      disabled={create.isPending}
      onClick={() => inputRef.current?.click()}
    >
      DOCX hochladen
    </Button>
  );

  return (
    <div className={styles.section}>
      <input
        ref={inputRef}
        type="file"
        accept={DOCX_ACCEPT}
        hidden
        data-testid="template-content-input"
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          // Erlaubt, dieselbe Datei erneut zu wählen
          event.target.value = '';
        }}
      />

      {content.exists ? (
        <>
          <div className={styles.status}>
            {content.error ? (
              <div className={styles.problem} role="status">
                <TriangleAlert />
                <span>{content.error}</span>
              </div>
            ) : (
              <StatusBadge tone="success" icon={<CircleCheck />}>
                Platzhalter in Ordnung
              </StatusBadge>
            )}
            {content.requiresDate && (
              <StatusBadge tone="info" icon={<CalendarDays />}>
                fragt beim Anlegen das Sitzungsdatum ab
              </StatusBadge>
            )}
          </div>
          {content.placeholders.length > 0 && (
            <Text size="sm" tone="muted">
              Verwendet:{' '}
              {content.placeholders.map((placeholder, index) => (
                <span key={placeholder}>
                  {index > 0 && ' · '}
                  <code className={styles.code}>{placeholder}</code>
                </span>
              ))}
            </Text>
          )}
          <div className={styles.actions}>
            <ButtonLink to={editPath} icon={<FilePen />}>
              Inhalt bearbeiten
            </ButtonLink>
            <Button icon={<Eye />} loading={previewing} onClick={() => void openPreview()}>
              Vorschau
            </Button>
            {uploadButton}
          </div>
        </>
      ) : (
        <>
          <Text size="sm" tone="muted">
            Noch kein Inhalt – neue Dokumente aus dieser Vorlage starten leer. Mit Platzhaltern wie{' '}
            <code className={styles.code}>{'{titel}'}</code> füllt sich der Inhalt beim Anlegen
            automatisch.
          </Text>
          <div className={styles.actions}>
            <Button icon={<FilePen />} loading={create.isPending} onClick={design}>
              Inhalt gestalten
            </Button>
            {uploadButton}
          </div>
        </>
      )}

      <PlaceholderHelp />

      <ConfirmDialog
        open={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        title="Inhalt ersetzen?"
        message={`Der bisherige Vorlageninhalt wird durch „${pendingFile?.name ?? ''}“ ersetzt.`}
        confirmLabel="Ersetzen"
        onConfirm={async () => {
          if (pendingFile) await uploadFile(pendingFile);
        }}
      />
    </div>
  );
}
