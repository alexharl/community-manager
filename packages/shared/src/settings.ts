import { z } from 'zod';

export interface Settings {
  communityName: string;
  logoUrl: string | null;
}

export const SettingsUpdateSchema = z.object({
  communityName: z.string().trim().min(1, 'Name darf nicht leer sein.').max(100),
});
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

/** Maximale Größe des Logos (Spezifikation Kap. 6.1). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
