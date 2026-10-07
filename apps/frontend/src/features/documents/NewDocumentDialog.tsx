import type { DocumentCreate, Template } from '@cm/shared';
import { CalendarDays, FilePlus, LayoutTemplate } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCreateDocument } from '../../api/documents';
import { useTemplates } from '../../api/templates';
import { TagList } from '../../components/chips';
import {
  Button,
  List,
  ListItem,
  LoadingState,
  Modal,
  Spinner,
  Stack,
  Text,
  TextField,
  useToast,
} from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import { todayIsoDate } from '../../lib/format';
import styles from './NewDocumentDialog.module.css';

interface NewDocumentDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Auswahl „Leeres Dokument“ oder Vorlage; legt an und öffnet den Editor (Kap. 7.4.3).
 * Datumsabhängige Vorlagen fragen vorher das Sitzungsdatum ab (Kap. 14.7).
 */
export function NewDocumentDialog({ open, onClose }: NewDocumentDialogProps) {
  if (!open) return null;
  return <NewDocumentChooser onClose={onClose} />;
}

// `undefined` = nichts gewählt, `null` = leeres Dokument, sonst Vorlagen-ID
type Choice = string | null | undefined;

const DATE_FORM_ID = 'new-document-date';

function NewDocumentChooser({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: templates, isPending } = useTemplates();
  const create = useCreateDocument();
  const [choice, setChoice] = useState<Choice>(undefined);
  const [dateFor, setDateFor] = useState<Template | null>(null);
  const [referenceDate, setReferenceDate] = useState(todayIsoDate);
  const busy = create.isPending;

  function start(input: DocumentCreate) {
    setChoice(input.templateId);
    create.mutate(input, {
      onSuccess: ({ id, warnings }) => {
        // z. B. „Veranstaltungen konnten nicht geladen werden“
        for (const warning of warnings) toast.show(warning, 'info');
        navigate(`/documents/${id}/edit`);
      },
      onError: (error) => {
        toast.error(errorMessage(error));
        setChoice(undefined);
      },
    });
  }

  function select(template: Template) {
    if (template.content.requiresDate) setDateFor(template);
    else start({ templateId: template.id });
  }

  if (dateFor) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Neues Dokument"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setDateFor(null)}>
              Zurück
            </Button>
            <Button
              type="submit"
              form={DATE_FORM_ID}
              variant="primary"
              loading={busy}
              disabled={!referenceDate}
            >
              Anlegen
            </Button>
          </>
        }
      >
        <form
          id={DATE_FORM_ID}
          onSubmit={(event) => {
            event.preventDefault();
            if (referenceDate) start({ templateId: dateFor.id, referenceDate });
          }}
        >
          <Stack gap={4}>
            <Text size="sm" tone="muted">
              „{dateFor.name}“ füllt Tage und Veranstaltungen rund um das Sitzungsdatum aus.
            </Text>
            <TextField
              type="date"
              label="Sitzungsdatum"
              className={styles.date}
              value={referenceDate}
              required
              autoFocus
              disabled={busy}
              onChange={(event) => setReferenceDate(event.target.value)}
            />
          </Stack>
        </form>
      </Modal>
    );
  }

  const spinnerFor = (id: string | null) => (choice === id ? <Spinner size="sm" /> : undefined);

  return (
    <Modal open onClose={onClose} title="Neues Dokument" dismissible={!busy} padded={false}>
      <List>
        <ListItem
          icon={<FilePlus />}
          title="Leeres Dokument"
          subtitle="Ohne Vorlage beginnen"
          onClick={() => start({ templateId: null })}
          disabled={busy}
          meta={spinnerFor(null)}
        />
        {templates?.map((template) => (
          <ListItem
            key={template.id}
            icon={<LayoutTemplate />}
            title={template.name}
            subtitle={template.tags.length > 0 ? <TagList tags={template.tags} /> : undefined}
            onClick={() => select(template)}
            disabled={busy}
            meta={
              spinnerFor(template.id) ??
              (template.content.requiresDate ? (
                <CalendarDays className={styles.dateIcon} aria-label="fragt das Sitzungsdatum ab" />
              ) : undefined)
            }
          />
        ))}
      </List>
      {isPending && <LoadingState label="Vorlagen werden geladen …" />}
      {templates?.length === 0 && (
        <Text tone="muted" size="sm" className={styles.hint}>
          Noch keine Vorlagen vorhanden. Vorlagen legst du unter Dokumente → Dokument-Einstellungen
          an.
        </Text>
      )}
    </Modal>
  );
}
