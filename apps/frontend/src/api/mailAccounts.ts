import type { MailAccount, MailAccountInput } from '@cm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const mailAccountKeys = {
  all: ['mail-accounts'] as const,
};

export function useMailAccounts() {
  return useQuery({
    queryKey: mailAccountKeys.all,
    queryFn: () => api<MailAccount[]>('/mail-accounts'),
  });
}

export function useSaveMailAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MailAccountInput }) =>
      id
        ? api<MailAccount>(`/mail-accounts/${id}`, { method: 'PUT', body: input })
        : api<MailAccount>('/mail-accounts', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mailAccountKeys.all }),
  });
}

export function useDeleteMailAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/mail-accounts/${id}`, { method: 'DELETE' }),
    // Wirkt auch auf Vorlagen und Dokumente („Mail-Konto gelöscht“) → alles neu laden
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useVerifyMailAccount() {
  return useMutation({
    mutationFn: (input: MailAccountInput & { id?: string }) =>
      api<{ ok: true }>('/mail-accounts/verify', { method: 'POST', body: input }),
  });
}
