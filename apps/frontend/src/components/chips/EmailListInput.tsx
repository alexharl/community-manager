import { isValidEmail, normalizeEmail } from '@cm/shared';
import { useRecipients } from '../../api/tags';
import { ChipInput, type ChipInputProps } from './ChipInput';

type EmailListInputProps = Omit<
  ChipInputProps,
  'suggestions' | 'normalize' | 'validate' | 'separators'
>;

const validate = (email: string) => (isValidEmail(email) ? null : 'Ungültige E-Mail-Adresse.');

/** E-Mail-Adressen wie Tags eingeben; Vorschläge aus bisher verwendeten Empfängern. */
export function EmailListInput({
  placeholder = 'E-Mail-Adresse hinzufügen …',
  ...props
}: EmailListInputProps) {
  const { data: recipients = [] } = useRecipients();
  return (
    <ChipInput
      {...props}
      placeholder={placeholder}
      suggestions={recipients}
      normalize={normalizeEmail}
      validate={validate}
      separators={/[,;\s]/}
      removeLabel={(email) => `${email} entfernen`}
    />
  );
}
