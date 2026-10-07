import type { Settings, SettingsUpdate } from '@cm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const settingsKeys = {
  all: ['settings'] as const,
};

/** Anzeigename, falls die Einstellungen nicht geladen werden können. */
export const FALLBACK_COMMUNITY_NAME = 'Community Manager';

/** Community-Name für Kopf und Startseite: leer während des Ladens, Ersatzname bei Fehler. */
export function useCommunityName(): string {
  const { data, isError } = useSettings();
  return data?.communityName ?? (isError ? FALLBACK_COMMUNITY_NAME : '');
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => api<Settings>('/settings'),
  });
}

/** Alle Einstellungs-Mutationen liefern die vollständigen Einstellungen zurück → Cache direkt setzen. */
function useSettingsMutation<TInput>(mutationFn: (input: TInput) => Promise<Settings>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (settings) => queryClient.setQueryData(settingsKeys.all, settings),
  });
}

export function useUpdateSettings() {
  return useSettingsMutation((input: SettingsUpdate) =>
    api<Settings>('/settings', { method: 'PATCH', body: input }),
  );
}

export function useUploadLogo() {
  return useSettingsMutation((file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<Settings>('/settings/logo', { method: 'PUT', body: form });
  });
}

export function useRemoveLogo() {
  return useSettingsMutation(() => api<Settings>('/settings/logo', { method: 'DELETE' }));
}
