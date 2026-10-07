import type { EditorConfigResponse, EditorMode } from '@cm/shared';
import { useQuery } from '@tanstack/react-query';
import type { ResolvedTheme } from '../theme/theme';
import { api } from './client';

/** Was im ONLYOFFICE-Editor geöffnet wird: ein Dokument oder ein Vorlageninhalt (Kap. 14.4). */
export interface EditorSource {
  kind: 'document' | 'template';
  id: string;
}

const editorConfigPath = ({ kind, id }: EditorSource, mode: EditorMode, theme: ResolvedTheme) =>
  kind === 'document'
    ? `/documents/${id}/editor-config?mode=${mode}&theme=${theme}`
    : `/templates/${id}/editor-config?theme=${theme}`;

/**
 * Editor-Konfiguration enthält den aktuellen ONLYOFFICE-Key → nie aus dem Cache wiederverwenden
 * und während der Sitzung nicht neu laden (das würde den Editor neu starten).
 */
export function useEditorConfig(source: EditorSource, mode: EditorMode, theme: ResolvedTheme) {
  return useQuery({
    queryKey: ['editor-config', source.kind, source.id, mode, theme],
    queryFn: () => api<EditorConfigResponse>(editorConfigPath(source, mode, theme)),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
