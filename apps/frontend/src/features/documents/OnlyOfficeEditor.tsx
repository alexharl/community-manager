import type { EditorConfigResponse, EditorMode } from '@cm/shared';
import { DocumentEditor, type DocumentEditorProps } from '@onlyoffice/document-editor-react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useEditorConfig, type EditorSource } from '../../api/editor';
import { Button, EmptyState, LoadingState } from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import { useTheme } from '../../theme/context';
import styles from './OnlyOfficeEditor.module.css';

interface OnlyOfficeEditorProps {
  source: EditorSource;
  mode: EditorMode;
}

const editorKey = (response: EditorConfigResponse | undefined) =>
  (response?.config.document as { key?: string } | undefined)?.key;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bindet den ONLYOFFICE-Editor ein (Bearbeiten oder Ansehen) – für Dokumente und Vorlageninhalte,
 * inkl. Lade- und Fehlerzustand.
 * Das Overlay verschwindet, sobald die Editor-Oberfläche steht – Meldungen von ONLYOFFICE
 * bleiben so immer sichtbar. `data-ready` markiert das fertig geladene Dokument.
 */
export function OnlyOfficeEditor({ source, mode }: OnlyOfficeEditorProps) {
  const { resolved } = useTheme();
  const { data, error, refetch } = useEditorConfig(source, mode, resolved);
  const [appReady, setAppReady] = useState(false);
  const [documentReady, setDocumentReady] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  // Neuer Schlüssel erzwingt einen frischen Editor
  const [attempt, setAttempt] = useState(0);

  /**
   * Editor mit frischer Konfiguration neu starten. Wird u. a. nach `onRequestRefreshFile`
   * aufgerufen: Das Dokument wurde mit einem Schlüssel geöffnet, dessen Sitzung gerade
   * gespeichert wurde – dann kurz auf den neuen Schlüssel warten (Kap. 5.2).
   */
  const reloadEditor = useCallback(
    async (previousKey?: string) => {
      setReloading(true);
      setAppReady(false);
      setDocumentReady(false);
      setEditorError(null);
      for (let tries = 0; tries < 5; tries++) {
        const { data: next } = await refetch();
        if (!previousKey || editorKey(next) !== previousKey) break;
        await wait(1000);
      }
      setAttempt((n) => n + 1);
      setReloading(false);
    },
    [refetch],
  );

  const failure = error ? errorMessage(error) : editorError;
  if (failure) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon={<TriangleAlert />}
          title="Editor konnte nicht geladen werden"
          description={failure}
          action={
            <Button icon={<RotateCw />} onClick={() => void reloadEditor()}>
              Erneut versuchen
            </Button>
          }
        />
      </div>
    );
  }

  const currentKey = editorKey(data);
  return (
    <div className={styles.container} data-ready={documentReady || undefined}>
      {(!appReady || reloading) && (
        <div className={styles.overlay}>
          <LoadingState label="Editor wird geladen …" />
        </div>
      )}
      {data && !reloading && (
        // Eigener Wrapper: ONLYOFFICE ersetzt das Platzhalter-div durch ein iframe
        <div key={attempt} className={styles.frame}>
          <DocumentEditor
            id={`onlyoffice-${source.kind}-${mode}-${source.id}`}
            documentServerUrl={data.documentServerUrl}
            config={data.config as DocumentEditorProps['config']}
            height="100%"
            width="100%"
            // Handler werden beim Erzeugen des Editors übernommen → nur stabile Funktionen
            events_onAppReady={() => setAppReady(true)}
            events_onDocumentReady={() => setDocumentReady(true)}
            events_onRequestRefreshFile={() => void reloadEditor(currentKey)}
            events_onError={(event) => {
              const detail = (event as { data?: { errorDescription?: string } }).data;
              setEditorError(detail?.errorDescription ?? 'Unbekannter Fehler im Editor.');
            }}
            onLoadComponentError={() =>
              setEditorError(
                'Der Document Server ist nicht erreichbar. Läuft der ONLYOFFICE-Container?',
              )
            }
          />
        </div>
      )}
    </div>
  );
}
