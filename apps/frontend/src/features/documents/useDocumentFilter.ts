import { useCallback, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

// Markiert URL-Änderungen, die vom Filter selbst stammen (siehe Abgleich unten)
const OWN_CHANGE = { documentFilter: true };
const SEARCH_DELAY_MS = 300;

/**
 * Filterzustand der Dokumentliste in der URL (`?q=…&tags=…&tags=…`), damit er beim
 * Zurücknavigieren erhalten bleibt (Kap. 7.2). Der Suchtext wird lokal geführt und
 * entprellt in die URL geschrieben, damit Tippen flüssig bleibt.
 */
export function useDocumentFilter() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const q = params.get('q') ?? '';
  const tags = params.getAll('tags');

  const [text, setText] = useState(q);
  const [seenKey, setSeenKey] = useState(location.key);

  // URL von außen geändert (z. B. Klick auf „Dokumente“ im Menü) → Eingabefeld übernehmen
  if (location.key !== seenKey) {
    setSeenKey(location.key);
    const own = (location.state as typeof OWN_CHANGE | null)?.documentFilter;
    if (!own) setText(q);
  }

  const update = useCallback(
    (patch: { q?: string; tags?: string[] }) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (patch.q !== undefined) {
            if (patch.q) next.set('q', patch.q);
            else next.delete('q');
          }
          if (patch.tags !== undefined) {
            next.delete('tags');
            for (const tag of patch.tags) next.append('tags', tag);
          }
          return next;
        },
        { replace: true, state: OWN_CHANGE },
      ),
    [setParams],
  );

  const pushQuery = useDebouncedCallback(
    (value: string) => update({ q: value.trim() }),
    SEARCH_DELAY_MS,
  );

  return {
    text,
    q,
    tags,
    active: q !== '' || tags.length > 0,
    setText: (value: string) => {
      setText(value);
      pushQuery.call(value);
    },
    setTags: (next: string[]) => update({ tags: next }),
    reset: () => {
      pushQuery.cancel();
      setText('');
      update({ q: '', tags: [] });
    },
  };
}
