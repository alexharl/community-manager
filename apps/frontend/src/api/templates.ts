import type { Template, TemplatePatch } from '@cm/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, apiBlob } from './client';
import { suggestionKeys } from './tags';

export const templateKeys = {
  all: ['templates'] as const,
  detail: (id: string) => ['templates', id] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: () => api<Template[]>('/templates'),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => api<Template>(`/templates/${id}`),
  });
}

/** Vorschau-PDF eines Vorlageninhalts, befüllt mit dem heutigen Datum (Kap. 14.4). */
export const fetchTemplatePreview = (id: string) => apiBlob(`/templates/${id}/preview`);

/** Liste und Vorschläge (Tags, Empfänger) können sich mit jeder Vorlagenänderung ändern. */
function invalidateDerived(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: templateKeys.all, exact: true });
  void queryClient.invalidateQueries({ queryKey: suggestionKeys.allTags });
  void queryClient.invalidateQueries({ queryKey: suggestionKeys.recipients });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<Template>('/templates', { method: 'POST', body: { name } }),
    onSuccess: (template) => {
      queryClient.setQueryData(templateKeys.detail(template.id), template);
      invalidateDerived(queryClient);
    },
  });
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: TemplatePatch) =>
      api<Template>(`/templates/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (template) => {
      queryClient.setQueryData(templateKeys.detail(id), template);
      invalidateDerived(queryClient);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/templates/${id}`, { method: 'DELETE' }),
    // Detail bewusst nicht entfernen: Die offene Seite würde sonst vor der Navigation neu laden (404)
    onSuccess: () => invalidateDerived(queryClient),
  });
}

/** Vorlage nach einer Inhaltsänderung übernehmen (Prüfergebnis, „fragt Datum ab“). */
function useContentMutation<T>(id: string, mutationFn: (input: T) => Promise<Template>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (template) => {
      queryClient.setQueryData(templateKeys.detail(id), template);
      void queryClient.invalidateQueries({ queryKey: templateKeys.all, exact: true });
    },
  });
}

/** „Inhalt gestalten“: leere DOCX anlegen (vorhandener Inhalt bleibt). */
export function useCreateTemplateContent(id: string) {
  return useContentMutation(id, () =>
    api<Template>(`/templates/${id}/content`, { method: 'POST' }),
  );
}

export function useUploadTemplateContent(id: string) {
  return useContentMutation(id, (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<Template>(`/templates/${id}/content`, { method: 'PUT', body: form });
  });
}

/** „Fertig“ im Vorlagen-Editor: sofort speichern; liefert das neue Prüfergebnis. */
export function useForceSaveTemplate(id: string) {
  return useContentMutation(id, () =>
    api<Template>(`/templates/${id}/forcesave`, { method: 'POST' }),
  );
}
