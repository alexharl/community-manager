import type { MailAccount } from '@cm/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useMailAccounts } from '../../api/mailAccounts';
import { Select } from '../../components/ui';

interface MailAccountSelectProps {
  value: string | null;
  /** Das zuvor gewählte Konto wurde gelöscht. */
  accountDeleted: boolean;
  onChange: (accountId: string) => void;
  label?: string;
}

const optionLabel = (account: MailAccount) =>
  account.label ? `${account.label} (${account.effectiveFromAddress})` : account.effectiveFromAddress;

const createLink = <Link to="/settings">Mail-Konto anlegen</Link>;

/** Kontoauswahl inkl. Hinweisen „Mail-Konto gelöscht“, „bitte wählen“ und „keine Konten“. */
export function MailAccountSelect({
  value,
  accountDeleted,
  onChange,
  label = 'Mail-Konto',
}: MailAccountSelectProps) {
  const { data: accounts, isPending } = useMailAccounts();
  const noAccounts = accounts?.length === 0;

  let warning: ReactNode;
  if (!value && !isPending) {
    if (noAccounts) {
      warning = (
        <>
          {accountDeleted ? 'Mail-Konto gelöscht.' : 'Noch kein Mail-Konto vorhanden.'} {createLink}
        </>
      );
    } else {
      warning = accountDeleted
        ? 'Mail-Konto gelöscht – bitte neu auswählen.'
        : 'Bitte ein Mail-Konto auswählen.';
    }
  }

  let placeholder = 'Mail-Konto wählen …';
  if (isPending) placeholder = 'Lädt …';
  else if (noAccounts) placeholder = 'Kein Mail-Konto';

  return (
    <Select
      label={label}
      value={value ?? ''}
      disabled={isPending || noAccounts}
      warning={warning}
      onChange={(event) => event.target.value && onChange(event.target.value)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {accounts?.map((account) => (
        <option key={account.id} value={account.id}>
          {optionLabel(account)}
        </option>
      ))}
    </Select>
  );
}
