const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** „07.10.2026“ */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/** „07.10.2026, 14:32“ */
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
