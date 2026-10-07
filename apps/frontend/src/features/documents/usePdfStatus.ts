import type { DocumentDetail } from '@cm/shared';
import { useEffect, useRef } from 'react';
import { useEnsurePdf } from '../../api/documents';
import { errorMessage } from '../../lib/errors';
import type { PdfState } from './PdfStatusItem';

/**
 * Erzeugt die PDF automatisch, sobald sie zur aktuellen Version fehlt (Kap. 7.4.8) –
 * je Version höchstens einmal von selbst, danach nur über „Erneut versuchen“.
 */
export function usePdfStatus(document: DocumentDetail) {
  const ensurePdf = useEnsurePdf(document.id);
  const { mutate } = ensurePdf;
  const requestedVersion = useRef<number | null>(null);
  const current = document.pdf?.current ?? false;

  useEffect(() => {
    if (current || requestedVersion.current === document.version) return;
    requestedVersion.current = document.version;
    mutate();
  }, [current, document.version, mutate]);

  let state: PdfState = 'missing';
  if (ensurePdf.isPending) state = 'generating';
  else if (current) state = 'ready';
  else if (ensurePdf.isError) state = 'error';
  // Veraltete PDF: die Neuerzeugung startet im selben Moment
  else if (document.pdf) state = 'generating';

  return {
    state,
    error: ensurePdf.isError ? errorMessage(ensurePdf.error) : null,
    href: `/api/documents/${document.id}/pdf?v=${document.pdf?.version ?? 0}`,
    retry: () => {
      requestedVersion.current = document.version;
      mutate();
    },
  };
}
