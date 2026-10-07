import type { Settings } from '@cm/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export const settingsKeys = {
  all: ['settings'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => api<Settings>('/settings'),
  });
}
