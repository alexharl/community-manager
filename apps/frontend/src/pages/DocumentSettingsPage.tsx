import { LayoutTemplate, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCreateTemplate, useTemplates } from '../api/templates';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  List,
  LoadingState,
  PromptDialog,
} from '../components/ui';
import { TemplateListItem } from '../features/templates/TemplateListItem';
import { usePageTitle } from '../hooks/usePageTitle';
import { errorMessage } from '../lib/errors';

export function DocumentSettingsPage() {
  usePageTitle('Dokument-Einstellungen');
  const navigate = useNavigate();
  const { data: templates, isPending, error } = useTemplates();
  const create = useCreateTemplate();
  const [creating, setCreating] = useState(false);

  async function handleCreate(name: string) {
    const template = await create.mutateAsync(name);
    navigate(`/documents/templates/${template.id}`);
  }

  let content;
  if (isPending) {
    content = <LoadingState />;
  } else if (error) {
    content = (
      <EmptyState
        icon={<TriangleAlert />}
        title="Vorlagen konnten nicht geladen werden"
        description={errorMessage(error)}
      />
    );
  } else if (templates.length === 0) {
    content = (
      <EmptyState
        icon={<LayoutTemplate />}
        title="Noch keine Vorlagen"
        description="Vorlagen geben neuen Dokumenten Tags und Mailversand-Einstellungen mit."
        action={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            Neue Vorlage
          </Button>
        }
      />
    );
  } else {
    content = (
      <List>
        {templates.map((template) => (
          <TemplateListItem key={template.id} template={template} />
        ))}
      </List>
    );
  }

  return (
    <>
      <PageHeader back="/documents" title="Dokument-Einstellungen" />
      <PageContent>
        <Card
          title="Vorlagen"
          padded={false}
          actions={
            <IconButton icon={<Plus />} label="Neue Vorlage" onClick={() => setCreating(true)} />
          }
        >
          {content}
        </Card>
      </PageContent>

      <PromptDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Neue Vorlage"
        label="Name"
        placeholder="z. B. Vorstandssitzung"
        onSubmit={handleCreate}
      />
    </>
  );
}
