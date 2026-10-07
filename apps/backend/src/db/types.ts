import type { ColumnType, Generated } from 'kysely';

/** Nullable Spalte, beim Einfügen optional. */
type Nullable<T> = ColumnType<T | null, T | null | undefined, T | null>;

export interface AppSettingsTable {
  id: Generated<number>;
  community_name: Generated<string>;
  logo_filename: Nullable<string>;
  logo_mime: Nullable<string>;
  updated_at: Generated<Date>;
}

export interface MailAccountsTable {
  id: Generated<string>;
  label: Nullable<string>;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass_enc: string;
  from_address: Nullable<string>;
  from_name: Nullable<string>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TemplatesTable {
  id: Generated<string>;
  name: string;
  tags: Generated<string[]>;
  mail_enabled: Generated<boolean>;
  mail_account_id: Nullable<string>;
  mail_account_deleted: Generated<boolean>;
  mail_recipients: Generated<string[]>;
  // Vorlageninhalt (Kap. 14.5); content_filename NULL = kein Inhalt
  content_filename: Nullable<string>;
  content_hash: Nullable<string>;
  content_version: Generated<number>;
  editor_key: Nullable<string>;
  placeholders: Generated<string[]>;
  requires_date: Generated<boolean>;
  content_error: Nullable<string>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DocumentsTable {
  id: Generated<string>;
  title: string;
  storage_path: string;
  docx_filename: string;
  pdf_filename: Nullable<string>;
  template_id: Nullable<string>;
  template_name: Nullable<string>;
  version: Generated<number>;
  content_hash: string;
  editor_key: string;
  content_text: Generated<string>;
  /** Generierte Spalte – nur für Suchabfragen, nie schreiben. */
  search_vector: ColumnType<string, never, never>;
  tags: Generated<string[]>;
  mail_enabled: Generated<boolean>;
  mail_account_id: Nullable<string>;
  mail_account_deleted: Generated<boolean>;
  mail_recipients: Generated<string[]>;
  pdf_version: Nullable<number>;
  pdf_created_at: Nullable<Date>;
  /** Sitzungsdatum (JJJJ-MM-TT), falls beim Anlegen abgefragt. */
  reference_date: Nullable<string>;
  created_at: Generated<Date>;
  edited_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type DispatchStatus = 'pending' | 'sent' | 'failed';

export interface DocumentDispatchesTable {
  id: Generated<string>;
  document_id: string;
  document_version: number;
  mail_account_id: Nullable<string>;
  from_address: string;
  to_addresses: string[];
  rejected_addresses: Generated<string[]>;
  subject: string;
  intro_text: Nullable<string>;
  status: DispatchStatus;
  error: Nullable<string>;
  message_id: Nullable<string>;
  created_at: Generated<Date>;
  sent_at: Nullable<Date>;
}

export interface Database {
  app_settings: AppSettingsTable;
  mail_accounts: MailAccountsTable;
  templates: TemplatesTable;
  documents: DocumentsTable;
  document_dispatches: DocumentDispatchesTable;
}
