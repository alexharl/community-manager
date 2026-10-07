import { useEffect } from 'react';
import { FALLBACK_COMMUNITY_NAME, useSettings } from '../api/settings';

/** Setzt den Browser-Tab-Titel auf „<Seite> – <Community-Name>“. */
export function usePageTitle(title?: string) {
  const { data } = useSettings();
  const name = data?.communityName ?? FALLBACK_COMMUNITY_NAME;

  useEffect(() => {
    document.title = title ? `${title} – ${name}` : name;
  }, [title, name]);
}
