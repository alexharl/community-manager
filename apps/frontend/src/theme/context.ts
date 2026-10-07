import { createContext, useContext } from 'react';
import type { ResolvedTheme, ThemePreference } from './theme';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme muss innerhalb von <ThemeProvider> verwendet werden.');
  return context;
}
