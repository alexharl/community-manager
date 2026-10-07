import { z } from 'zod';

export interface Settings {
  communityName: string;
  logoUrl: string | null;
}

export const SettingsUpdateSchema = z.object({
  communityName: z.string().trim().min(1, 'Name darf nicht leer sein.').max(100),
});
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;
