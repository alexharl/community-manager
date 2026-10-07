import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export type TagScope = 'all' | 'documents';

export const suggestionKeys = {
  tags: (scope: TagScope) => ['tags', scope] as const,
  allTags: ['tags'] as const,
  recipients: ['recipients'] as const,
};

/** `all`: Vorschläge für Eingaben (Dokumente + Vorlagen), `documents`: Tag-Filterleiste. */
export function useTags(scope: TagScope) {
  return useQuery({
    queryKey: suggestionKeys.tags(scope),
    queryFn: () => api<string[]>(`/tags?scope=${scope}`),
  });
}

/** Bisher verwendete Empfängeradressen als Vorschläge. */
export function useRecipients() {
  return useQuery({
    queryKey: suggestionKeys.recipients,
    queryFn: () => api<string[]>('/recipients'),
  });
}
