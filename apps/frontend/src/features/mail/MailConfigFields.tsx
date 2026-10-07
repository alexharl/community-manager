import type { MailConfig } from '@cm/shared';
import { EmailListInput } from '../../components/chips';
import styles from './MailConfigFields.module.css';
import { MailAccountSelect } from './MailAccountSelect';

export type MailConfigFieldsPatch = Partial<Pick<MailConfig, 'accountId' | 'recipients'>>;

interface MailConfigFieldsProps {
  value: MailConfig;
  onChange: (patch: MailConfigFieldsPatch) => void;
  recipientsHint?: string;
}

/** Mail-Konto und Empfänger nebeneinander – in der Vorlage und auf der Abschlussseite (Kap. 7.5). */
export function MailConfigFields({ value, onChange, recipientsHint }: MailConfigFieldsProps) {
  return (
    <div className={styles.fields}>
      <MailAccountSelect
        value={value.accountId}
        accountDeleted={value.accountDeleted}
        onChange={(accountId) => onChange({ accountId })}
      />
      <EmailListInput
        label="Empfänger"
        hint={recipientsHint}
        value={value.recipients}
        onChange={(recipients) => onChange({ recipients })}
      />
    </div>
  );
}
