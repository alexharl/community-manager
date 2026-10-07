import { TemplateNameSchema, type Template, type TemplatePatch } from '@cm/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDeleteTemplate, useUpdateTemplate } from '../../api/templates';
import { TagInput } from '../../components/chips';
import { PageContent } from '../../components/layout/PageContent';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  Button,
  Card,
  ConfirmDialog,
  SaveStatus,
  Stack,
  Switch,
  Text,
  TextField,
  useToast,
} from '../../components/ui';
import { useAutosave } from '../../hooks/useAutosave';
import { MailConfigFields } from '../mail/MailConfigFields';
import { applyMailPatch, type MailPatch } from '../mail/mailPatch';
import { TemplateContentSection } from './TemplateContentSection';
import styles from './TemplateEditor.module.css';

/** Bearbeitungsansicht einer Vorlage mit Autosave (Spezifikation Kap. 7.4.5). */
export function TemplateEditor({ template }: { template: Template }) {
  const navigate = useNavigate();
  const toast = useToast();
  const update = useUpdateTemplate(template.id);
  const remove = useDeleteTemplate();
  const autosave = useAutosave((patch: TemplatePatch) => update.mutateAsync(patch));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Lokaler Entwurf: Eingaben bleiben stabil, während im Hintergrund gespeichert wird
  const [name, setName] = useState(template.name);
  const [tags, setTags] = useState(template.tags);
  const [mail, setMail] = useState(template.mail);
  const nameResult = TemplateNameSchema.safeParse(name);
  const title = nameResult.success ? nameResult.data : template.name;

  function changeName(value: string) {
    setName(value);
    const result = TemplateNameSchema.safeParse(value);
    if (result.success) autosave.schedule({ name: result.data });
  }

  function changeTags(value: string[]) {
    setTags(value);
    autosave.saveNow({ tags: value });
  }

  function changeMail(patch: MailPatch) {
    setMail((current) => applyMailPatch(current, patch));
    autosave.saveNow({ mail: patch });
  }

  async function handleDelete() {
    autosave.discard();
    await remove.mutateAsync(template.id);
    toast.success('Vorlage gelöscht.');
    navigate('/documents/settings');
  }

  return (
    <>
      <PageHeader
        back="/documents/settings"
        title={title}
        status={<SaveStatus state={autosave.state} error={autosave.error} />}
        actions={
          <Button variant="ghost" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
            Löschen
          </Button>
        }
      />
      <PageContent>
        <Card title="Vorlage">
          <Stack gap={5}>
            <TextField
              className={styles.name}
              label="Name"
              value={name}
              maxLength={100}
              error={nameResult.success ? undefined : nameResult.error.issues[0]?.message}
              onChange={(event) => changeName(event.target.value)}
            />
            <TagInput
              label="Tags"
              hint="Werden neuen Dokumenten aus dieser Vorlage automatisch zugewiesen."
              value={tags}
              onChange={changeTags}
            />
            <Stack gap={1}>
              <Text size="sm" strong>
                Inhalt
              </Text>
              <TemplateContentSection template={template} />
            </Stack>
            <div className={styles.mailSection}>
              <Switch
                label="Mailversand"
                checked={mail.enabled}
                onChange={(enabled) => changeMail({ enabled })}
              />
              {mail.enabled && (
                <MailConfigFields
                  value={mail}
                  onChange={changeMail}
                  recipientsHint="Optional – lässt sich beim Versand noch anpassen."
                />
              )}
            </div>
          </Stack>
        </Card>
      </PageContent>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Vorlage löschen?"
        message={`Vorlage „${title}“ löschen? Bereits erstellte Dokumente bleiben erhalten.`}
        confirmLabel="Löschen"
        danger
        onConfirm={handleDelete}
      />
    </>
  );
}
