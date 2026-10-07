import { sql, type Kysely } from 'kysely';

// Schema gemäß Spezifikation Kap. 4.2
const statements = [
  `CREATE TABLE app_settings (
    id              smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    community_name  text        NOT NULL DEFAULT 'Mein Verein',
    logo_filename   text,
    logo_mime       text,
    updated_at      timestamptz NOT NULL DEFAULT now()
  )`,
  `INSERT INTO app_settings DEFAULT VALUES`,

  `CREATE TABLE mail_accounts (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    label           text,
    smtp_host       text        NOT NULL,
    smtp_port       integer     NOT NULL CHECK (smtp_port BETWEEN 1 AND 65535),
    smtp_user       text        NOT NULL,
    smtp_pass_enc   text        NOT NULL,
    from_address    text,
    from_name       text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE templates (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  text        NOT NULL,
    tags                  text[]      NOT NULL DEFAULT '{}',
    mail_enabled          boolean     NOT NULL DEFAULT false,
    mail_account_id       uuid        REFERENCES mail_accounts(id) ON DELETE SET NULL,
    mail_account_deleted  boolean     NOT NULL DEFAULT false,
    mail_recipients       text[]      NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE documents (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 text        NOT NULL,
    storage_path          text        NOT NULL,
    docx_filename         text        NOT NULL,
    pdf_filename          text,
    template_id           uuid        REFERENCES templates(id) ON DELETE SET NULL,
    template_name         text,
    version               integer     NOT NULL DEFAULT 1,
    content_hash          text        NOT NULL,
    editor_key            text        NOT NULL,
    content_text          text        NOT NULL DEFAULT '',
    search_vector         tsvector    GENERATED ALWAYS AS (
                            setweight(to_tsvector('german', title), 'A') ||
                            setweight(to_tsvector('german', content_text), 'B')
                          ) STORED,
    tags                  text[]      NOT NULL DEFAULT '{}',
    mail_enabled          boolean     NOT NULL DEFAULT false,
    mail_account_id       uuid        REFERENCES mail_accounts(id) ON DELETE SET NULL,
    mail_account_deleted  boolean     NOT NULL DEFAULT false,
    mail_recipients       text[]      NOT NULL DEFAULT '{}',
    pdf_version           integer,
    pdf_created_at        timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    edited_at             timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX documents_list_idx   ON documents (created_at DESC, id DESC)`,
  `CREATE INDEX documents_search_idx ON documents USING gin (search_vector)`,
  `CREATE INDEX documents_tags_idx   ON documents USING gin (tags)`,

  `CREATE TABLE document_dispatches (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version    integer     NOT NULL,
    mail_account_id     uuid        REFERENCES mail_accounts(id) ON DELETE SET NULL,
    from_address        text        NOT NULL,
    to_addresses        text[]      NOT NULL,
    rejected_addresses  text[]      NOT NULL DEFAULT '{}',
    subject             text        NOT NULL,
    intro_text          text,
    status              text        NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    error               text,
    message_id          text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    sent_at             timestamptz
  )`,
  `CREATE INDEX document_dispatches_doc_idx ON document_dispatches (document_id, created_at DESC)`,
];

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const statement of statements) {
    await sql.raw(statement).execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw('DROP TABLE IF EXISTS document_dispatches, documents, templates, mail_accounts, app_settings')
    .execute(db);
}
