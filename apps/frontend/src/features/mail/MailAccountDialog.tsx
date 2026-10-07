import { MailAccountInputSchema, type MailAccount, type MailAccountInput } from '@cm/shared';
import { PlugZap } from 'lucide-react';
import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSaveMailAccount, useVerifyMailAccount } from '../../api/mailAccounts';
import { useSettings } from '../../api/settings';
import { Button, Modal, Text, TextField, useToast } from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import styles from './MailAccountDialog.module.css';

type FormKey = 'label' | 'smtpHost' | 'smtpPort' | 'smtpUser' | 'smtpPass' | 'fromAddress' | 'fromName';
type FormState = Record<FormKey, string>;
type FieldErrors = Partial<Record<FormKey, string>>;

const toForm = (account: MailAccount | null): FormState => ({
  label: account?.label ?? '',
  smtpHost: account?.smtpHost ?? '',
  smtpPort: String(account?.smtpPort ?? 587),
  smtpUser: account?.smtpUser ?? '',
  smtpPass: '',
  fromAddress: account?.fromAddress ?? '',
  fromName: account?.fromName ?? '',
});

/** Prüft mit demselben Schema wie das Backend; beim Anlegen ist das Passwort Pflicht. */
function validate(form: FormState, requirePassword: boolean) {
  const errors: FieldErrors = {};
  const result = MailAccountInputSchema.safeParse({ ...form, smtpPass: form.smtpPass || undefined });
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors[issue.path[0] as FormKey] ??= issue.message;
    }
  }
  if (requirePassword && !form.smtpPass) errors.smtpPass = 'SMTP-Passwort fehlt.';

  const input: MailAccountInput | null =
    result.success && Object.keys(errors).length === 0 ? result.data : null;
  return { input, errors };
}

interface MailAccountDialogProps {
  open: boolean;
  /** `null` legt ein neues Konto an. */
  account: MailAccount | null;
  onClose: () => void;
}

export function MailAccountDialog({ open, ...props }: MailAccountDialogProps) {
  if (!open) return null;
  return <MailAccountForm {...props} />;
}

function MailAccountForm({ account, onClose }: Omit<MailAccountDialogProps, 'open'>) {
  const isNew = account === null;
  const formId = useId();
  const [form, setForm] = useState(() => toForm(account));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const save = useSaveMailAccount();
  const verify = useVerifyMailAccount();
  const toast = useToast();
  const { data: settings } = useSettings();

  const bind = (key: FormKey) => ({
    value: form[key],
    error: errors[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setForm((current) => ({ ...current, [key]: value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
      setVerifyResult(null);
    },
  });

  /** Validiert und liefert die Eingabe, sonst werden Feldfehler angezeigt. */
  function validInput() {
    const { input, errors: nextErrors } = validate(form, isNew);
    setErrors(nextErrors);
    return input;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const input = validInput();
    if (!input) return;
    setSubmitError(null);
    save.mutate(
      { id: account?.id, input },
      {
        onSuccess: () => {
          toast.success('Mail-Konto gespeichert.');
          onClose();
        },
        onError: (error) => setSubmitError(errorMessage(error)),
      },
    );
  }

  function handleVerify() {
    const input = validInput();
    if (!input) return;
    setVerifyResult(null);
    verify.mutate(
      { ...input, id: account?.id },
      {
        onSuccess: () => setVerifyResult({ ok: true, message: 'Verbindung und Anmeldung erfolgreich.' }),
        onError: (error) => setVerifyResult({ ok: false, message: errorMessage(error) }),
      },
    );
  }

  const busy = save.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Mail-Konto hinzufügen' : 'Mail-Konto bearbeiten'}
      dismissible={!busy}
      footer={
        <>
          <Button
            className={styles.verify}
            icon={<PlugZap />}
            loading={verify.isPending}
            disabled={busy}
            onClick={handleVerify}
          >
            Verbindung testen
          </Button>
          <Button onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={busy}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Bezeichnung (optional)"
          hint="Wird in Auswahllisten angezeigt."
          placeholder={form.smtpUser || 'z. B. Vorstand'}
          data-autofocus
          {...bind('label')}
        />
        <div className={styles.hostRow}>
          <TextField label="SMTP-Host" placeholder="smtp.example.org" {...bind('smtpHost')} />
          <TextField label="Port" inputMode="numeric" {...bind('smtpPort')} />
        </div>
        <TextField label="SMTP-Benutzer" autoComplete="off" {...bind('smtpUser')} />
        <TextField
          label="SMTP-Passwort"
          type="password"
          autoComplete="new-password"
          placeholder={isNew ? undefined : 'unverändert'}
          {...bind('smtpPass')}
        />
        <div className={styles.twoColumns}>
          <TextField
            label="Absenderadresse (optional)"
            type="email"
            placeholder={form.smtpUser || 'wie SMTP-Benutzer'}
            {...bind('fromAddress')}
          />
          <TextField
            label="Absendername (optional)"
            placeholder={settings?.communityName}
            {...bind('fromName')}
          />
        </div>
        <Text tone="muted" size="sm">
          Port 465 verwendet TLS, andere Ports STARTTLS, sofern der Server es anbietet.
        </Text>
        {verifyResult && (
          <Text tone={verifyResult.ok ? 'success' : 'danger'} size="sm">
            {verifyResult.message}
          </Text>
        )}
        {submitError && (
          <Text tone="danger" size="sm">
            {submitError}
          </Text>
        )}
      </form>
    </Modal>
  );
}
