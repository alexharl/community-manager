import { useEffect } from 'react';
import { useSettings } from '../api/settings';

/** Setzt den Browser-Tab-Titel auf „<Seite> – <Community-Name>“. */
export function usePageTitle(title?: string) {
  const { data } = useSettings();
  const name = data?.communityName ?? 'Community Manager';

  useEffect(() => {
    document.title = title ? `${title} – ${name}` : name;
  }, [title, name]);
}
