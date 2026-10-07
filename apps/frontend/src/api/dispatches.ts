import type { Dispatch, DispatchCreate } from '@cm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { documentKeys } from './documents';
import { suggestionKeys } from './tags';

export const dispatchKeys = {
  list: (documentId: string) => ['documents', 'dispatches', documentId] as const,
};

export function useDispatches(documentId: string) {
  return useQuery({
    queryKey: dispatchKeys.list(documentId),
    queryFn: () => api<Dispatch[]>(`/documents/${documentId}/dispatches`),
    // Solange etwas versendet wird, alle 2 s nachsehen (Kap. 7.4.8)
    refetchInterval: (query) =>
      query.state.data?.some((dispatch) => dispatch.status === 'pending') ? 2000 : false,
  });
}

export function useSendDispatch(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DispatchCreate) =>
      api<Dispatch>(`/documents/${documentId}/dispatches`, { method: 'POST', body: input }),
    onSuccess: (dispatch) => {
      // Neue Versendung sofort als „wird versendet“ zeigen; Polling übernimmt den Rest
      queryClient.setQueryData<Dispatch[]>(dispatchKeys.list(documentId), (list) => [
        dispatch,
        ...(list ?? []),
      ]);
      void queryClient.invalidateQueries({ queryKey: suggestionKeys.recipients });
    },
    // z. B. CONFIG_CHANGED: gespeicherten Stand neu laden
    onError: () =>
      void queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) }),
  });
}
