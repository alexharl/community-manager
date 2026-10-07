import { FilePlus, LayoutTemplate } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCreateDocument } from '../../api/documents';
import { useTemplates } from '../../api/templates';
import { TagList } from '../../components/chips';
import { List, ListItem, LoadingState, Modal, Spinner, Text, useToast } from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import styles from './NewDocumentDialog.module.css';

interface NewDocumentDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Auswahl „Leeres Dokument“ oder Vorlage; legt an und öffnet den Editor (Kap. 7.4.3). */
export function NewDocumentDialog({ open, onClose }: NewDocumentDialogProps) {
  if (!open) return null;
  return <NewDocumentChooser onClose={onClose} />;
}

// `undefined` = nichts gewählt, `null` = leeres Dokument, sonst Vorlagen-ID
type Choice = string | null | undefined;

function NewDocumentChooser({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: templates, isPending } = useTemplates();
  const create = useCreateDocument();
  const [choice, setChoice] = useState<Choice>(undefined);
  const busy = choice !== undefined;

  function start(templateId: string | null) {
    setChoice(templateId);
    create.mutate(templateId, {
      onSuccess: (doc) => navigate(`/documents/${doc.id}/edit`),
      onError: (error) => {
        toast.error(errorMessage(error));
        setChoice(undefined);
      },
    });
  }

  const spinnerFor = (id: string | null) => (choice === id ? <Spinner size="sm" /> : undefined);

  return (
    <Modal open onClose={onClose} title="Neues Dokument" dismissible={!busy} padded={false}>
      <List>
        <ListItem
          icon={<FilePlus />}
          title="Leeres Dokument"
          subtitle="Ohne Vorlage beginnen"
          onClick={() => start(null)}
          disabled={busy}
          meta={spinnerFor(null)}
        />
        {templates?.map((template) => (
          <ListItem
            key={template.id}
            icon={<LayoutTemplate />}
            title={template.name}
            subtitle={template.tags.length > 0 ? <TagList tags={template.tags} /> : undefined}
            onClick={() => start(template.id)}
            disabled={busy}
            meta={spinnerFor(template.id)}
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
