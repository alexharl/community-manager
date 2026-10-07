export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Gleicher Schlüssel wie im Inline-Skript in index.html
const STORAGE_KEY = 'cm.theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function storePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – Theme gilt dann nur für diese Sitzung
  }
}

export const systemPrefersDark = (): boolean => darkQuery().matches;

export function subscribeSystemTheme(onChange: () => void): () => void {
  const query = darkQuery();
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
