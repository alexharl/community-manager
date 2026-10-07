import type { MailAccount } from '@cm/shared';
import { Mail, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useDeleteMailAccount, useMailAccounts } from '../../api/mailAccounts';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  List,
  ListItem,
  LoadingState,
  Text,
  useToast,
} from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import { MailAccountDialog } from './MailAccountDialog';

const templatesLabel = (count: number) => (count === 1 ? '1 Vorlage' : `${count} Vorlagen`);

export function MailAccountsCard() {
  const { data: accounts, isPending, error } = useMailAccounts();
  const remove = useDeleteMailAccount();
  const toast = useToast();
  const [editing, setEditing] = useState<MailAccount | 'new' | null>(null);
  const [deleting, setDeleting] = useState<MailAccount | null>(null);

  let content;
  if (isPending) {
    content = <LoadingState />;
  } else if (error) {
    content = (
      <EmptyState
        icon={<TriangleAlert />}
        title="Mail-Konten konnten nicht geladen werden"
        description={errorMessage(error)}
      />
    );
  } else if (accounts.length === 0) {
    content = (
      <EmptyState
        icon={<Mail />}
        title="Noch keine Mail-Konten"
        description="Mail-Konten werden für den Versand von Dokumenten benötigt."
        action={
          <Button icon={<Plus />} onClick={() => setEditing('new')}>
            Mail-Konto hinzufügen
          </Button>
        }
      />
    );
  } else {
    content = (
      <List>
        {accounts.map((account) => (
          <ListItem
            key={account.id}
            icon={<Mail />}
            title={account.displayName}
            subtitle={`${account.effectiveFromAddress} · ${account.smtpHost}:${account.smtpPort}`}
            meta={account.templateCount > 0 ? templatesLabel(account.templateCount) : undefined}
            onClick={() => setEditing(account)}
            trailing={
              <IconButton
                icon={<Trash2 />}
                label={`„${account.displayName}“ löschen`}
                variant="danger"
                onClick={() => setDeleting(account)}
              />
            }
          />
        ))}
      </List>
    );
  }

  return (
    <>
      <Card
        title="Mail-Konten"
        padded={false}
        actions={
          <IconButton
            icon={<Plus />}
            label="Mail-Konto hinzufügen"
            onClick={() => setEditing('new')}
          />
        }
      >
        {content}
      </Card>

      <MailAccountDialog
        open={editing !== null}
        account={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Mail-Konto löschen?"
        message={deleting && `Mail-Konto „${deleting.displayName}“ wirklich löschen?`}
        confirmLabel="Löschen"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success('Mail-Konto gelöscht.');
        }}
      >
        {deleting && deleting.templateCount > 0 && (
          <Text tone="warning" size="sm">
            Wird von {templatesLabel(deleting.templateCount)} verwendet. Dort muss anschließend ein
            neues Konto gewählt werden.
          </Text>
        )}
      </ConfirmDialog>
    </>
  );
}
