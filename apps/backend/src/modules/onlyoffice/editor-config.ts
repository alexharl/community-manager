import type { EditorConfigResponse, EditorMode } from '@cm/shared';
import type { Config } from '../../config';
import { signToken } from './jwt';

/** Was im Editor geöffnet wird: Dokument oder Vorlageninhalt. */
export interface EditorFile {
  /** `documents` bzw. `templates` – Pfadsegment der ONLYOFFICE-Endpunkte */
  kind: 'documents' | 'templates';
  id: string;
  title: string;
  editorKey: string;
}

/** Signierte Editor-Konfiguration für den Browser (Spezifikation Kap. 5.2). */
export async function buildEditorConfig(
  config: Config['onlyoffice'],
  file: EditorFile,
  mode: EditorMode,
  theme: 'light' | 'dark',
): Promise<EditorConfigResponse> {
  const base = `${config.backendUrl}/api/onlyoffice/${file.kind}/${file.id}`;
  const editorConfig = {
    documentType: 'word',
    document: {
      fileType: 'docx',
      key: file.editorKey,
      title: `${file.title}.docx`,
      url: `${base}/file`,
      permissions: {
        edit: mode === 'edit',
        download: true,
        print: true,
        review: false,
        comment: false,
      },
    },
    editorConfig: {
      mode,
      lang: 'de',
      region: 'de-DE',
      callbackUrl: `${base}/callback`,
      // Platzhalter bis zur Authentifizierung
      user: { id: 'local', name: 'Vorstand' },
      customization: {
        autosave: true,
        forcesave: false,
        compactHeader: true,
        feedback: false,
        // Keine Hinweis-Popups zu neuen ONLYOFFICE-Funktionen
        features: { featuresTips: false },
        uiTheme: theme === 'dark' ? 'default-dark' : 'default-light',
      },
    },
  };

  return {
    documentServerUrl: config.publicUrl,
    config: { ...editorConfig, token: await signToken(editorConfig, config.jwtSecret) },
  };
}
