import type { Template, TemplatePatch } from '@cm/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
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
