import type {
  DocumentCreate,
  DocumentCreateResult,
  DocumentDetail,
  DocumentPatch,
  DocumentSummary,
  Page,
  PdfInfo,
} from '@cm/shared';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import { suggestionKeys } from './tags';

export const documentKeys = {
  all: ['documents'] as const,
  lists: ['documents', 'list'] as const,
  list: (filter: DocumentFilter) =>
    ['documents', 'list', filter.q, [...filter.tags].sort()] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
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

/** `alwaysFresh`: bei jedem Fensterfokus neu laden, z. B. auf der Abschlussseite (Kap. 7.4.8). */
export function useDocument(id: string, { alwaysFresh = false }: { alwaysFresh?: boolean } = {}) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => api<DocumentDetail>(`/documents/${id}`),
    ...(alwaysFresh ? { staleTime: 0, refetchOnWindowFocus: 'always' as const } : {}),
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
    /** Bei smarten Vorlagen mit Sitzungsdatum; Antwort enthält ggf. Hinweise (Kap. 14.4). */
    mutationFn: (input: DocumentCreate) =>
      api<DocumentCreateResult>('/documents', { method: 'POST', body: input }),
    onSuccess: ({ warnings: _warnings, ...doc }) => {
      queryClient.setQueryData<DocumentDetail>(documentKeys.detail(doc.id), doc);
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

/** Erzeugt die PDF zur aktuellen Version, falls nötig (Kap. 5.4). */
export function useEnsurePdf(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<PdfInfo>(`/documents/${id}/pdf`, { method: 'POST' }),
    onSuccess: (pdf) => {
      const doc = queryClient.getQueryData<DocumentDetail>(documentKeys.detail(id));
      if (doc && doc.version === pdf.version) {
        queryClient.setQueryData(documentKeys.detail(id), { ...doc, pdf });
      } else {
        void queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
      }
    },
  });
}
