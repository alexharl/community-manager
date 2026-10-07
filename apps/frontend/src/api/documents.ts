import type {
  DocumentDetail,
  DocumentPatch,
  DocumentSummary,
  EditorConfigResponse,
  EditorMode,
  Page,
} from '@cm/shared';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { ResolvedTheme } from '../theme/theme';
import { api } from './client';
import { suggestionKeys } from './tags';

export const documentKeys = {
  all: ['documents'] as const,
  lists: ['documents', 'list'] as const,
  list: (filter: DocumentFilter) =>
    ['documents', 'list', filter.q, [...filter.tags].sort()] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
  editorConfig: (id: string, mode: EditorMode, theme: ResolvedTheme) =>
    ['documents', 'editor-config', id, mode, theme] as const,
};

export interface DocumentFilter {
  q: string;
  tags: string[];
}

const PAGE_SIZE = 20;

/** Dokumentliste seitenweise (Keyset-Cursor), gefiltert nach Suche und Tags (Kap. 7.4.3). */
export function useDocuments(filter: DocumentFilter) {
  return useInfiniteQuery({
    queryKey: documentKeys.list(filter),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (filter.q) params.set('q', filter.q);
      for (const tag of filter.tags) params.append('tags', tag);
      if (pageParam) params.set('cursor', pageParam);
      return api<Page<DocumentSummary>>(`/documents?${params}`, { signal });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Beim Tippen die bisherigen Treffer zeigen, bis die neuen da sind
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => api<DocumentDetail>(`/documents/${id}`),
  });
}

/**
 * Editor-Konfiguration enthält den aktuellen ONLYOFFICE-Key → nie aus dem Cache wiederverwenden
 * und während der Sitzung nicht neu laden (das würde den Editor neu starten).
 */
export function useEditorConfig(id: string, mode: EditorMode, theme: ResolvedTheme) {
  return useQuery({
    queryKey: documentKeys.editorConfig(id, mode, theme),
    queryFn: () => api<EditorConfigResponse>(`/documents/${id}/editor-config?mode=${mode}&theme=${theme}`),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/** Listen, Tag-Vorschläge und Empfänger können sich mit jeder Dokumentänderung ändern. */
function invalidateLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: documentKeys.lists });
  void queryClient.invalidateQueries({ queryKey: suggestionKeys.allTags });
  void queryClient.invalidateQueries({ queryKey: suggestionKeys.recipients });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string | null) =>
      api<DocumentDetail>('/documents', { method: 'POST', body: { templateId } }),
    onSuccess: (doc) => {
      queryClient.setQueryData(documentKeys.detail(doc.id), doc);
      invalidateLists(queryClient);
    },
  });
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: DocumentPatch) =>
      api<DocumentDetail>(`/documents/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (doc) => {
      queryClient.setQueryData(documentKeys.detail(id), doc);
      invalidateLists(queryClient);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/documents/${id}`, { method: 'DELETE' }),
    // Detail nicht entfernen: Die offene Seite würde sonst vor der Navigation neu laden (404)
    onSuccess: () => invalidateLists(queryClient),
  });
}

/** „Abschließen“: sofort speichern lassen und auf den neuen Stand warten (Kap. 5.3). */
export function useForceSave(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ version: number }>(`/documents/${id}/forcesave`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
      invalidateLists(queryClient);
    },
  });
}
