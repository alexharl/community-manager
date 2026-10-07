import { useEffect } from 'react';

const DEFAULT_ICON = '/favicon.svg';

/** Verwendet das Community-Logo als Favicon, sonst das Standard-Icon. */
export function useFavicon(url: string | null) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    link.href = url ?? DEFAULT_ICON;
    if (url) link.removeAttribute('type');
    else link.type = 'image/svg+xml';
  }, [url]);
}
