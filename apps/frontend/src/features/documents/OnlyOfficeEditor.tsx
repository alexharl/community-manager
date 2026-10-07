import type { EditorMode } from '@cm/shared';
import { DocumentEditor, type DocumentEditorProps } from '@onlyoffice/document-editor-react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useEditorConfig } from '../../api/documents';
import { Button, EmptyState, LoadingState } from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import { useTheme } from '../../theme/context';
import styles from './OnlyOfficeEditor.module.css';

interface OnlyOfficeEditorProps {
  documentId: string;
  mode: EditorMode;
}

// Die Komponente ruft onAppReady ungeprüft auf – daher immer einen Handler übergeben
const noop = () => undefined;

/** Bindet den ONLYOFFICE-Editor ein (Bearbeiten oder Ansehen), inkl. Lade- und Fehlerzustand. */
export function OnlyOfficeEditor({ documentId, mode }: OnlyOfficeEditorProps) {
  const { resolved } = useTheme();
  const { data, error, isPending, refetch } = useEditorConfig(documentId, mode, resolved);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Neuer Schlüssel erzwingt nach einem Fehler einen frischen Editor
  const [attempt, setAttempt] = useState(0);

  if (error || loadError) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon={<TriangleAlert />}
          title="Editor konnte nicht geladen werden"
          description={
            loadError
              ? 'Der Document Server ist nicht erreichbar. Läuft der ONLYOFFICE-Container?'
              : errorMessage(error)
          }
          action={
            <Button
              icon={<RotateCw />}
              onClick={() => {
                setLoadError(null);
                setReady(false);
                setAttempt((n) => n + 1);
                void refetch();
              }}
            >
              Erneut versuchen
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.container} data-ready={ready || undefined}>
      {!ready && (
        <div className={styles.overlay}>
          <LoadingState label="Editor wird geladen …" />
        </div>
      )}
      {!isPending && (
        // Eigener Wrapper: ONLYOFFICE ersetzt das Platzhalter-div durch ein iframe
        <div key={attempt} className={styles.frame}>
          <DocumentEditor
            id={`onlyoffice-${mode}-${documentId}`}
            documentServerUrl={data.documentServerUrl}
            config={data.config as DocumentEditorProps['config']}
            height="100%"
            width="100%"
            events_onAppReady={noop}
            events_onDocumentReady={() => setReady(true)}
            onLoadComponentError={(_code, description) => setLoadError(description)}
          />
        </div>
      )}
    </div>
  );
}
