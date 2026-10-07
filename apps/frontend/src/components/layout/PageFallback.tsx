import { SearchX, TriangleAlert } from 'lucide-react';
import { ApiError } from '../../api/client';
import { errorMessage } from '../../lib/errors';
import { ButtonLink, Card, EmptyState, LoadingState } from '../ui';
import { PageContent } from './PageContent';
import { PageHeader } from './PageHeader';

interface PageFallbackProps {
  /** Allgemeiner Titel, solange das Objekt nicht geladen ist, z. B. „Vorlage“. */
  title: string;
  back: string;
  backLabel: string;
  isPending: boolean;
  error: unknown;
  notFoundTitle: string;
}

/** Lade-, „nicht gefunden“- und Fehleransicht für Detailseiten. */
export function PageFallback({
  title,
  back,
  backLabel,
  isPending,
  error,
  notFoundTitle,
}: PageFallbackProps) {
  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <>
      <PageHeader back={back} title={title} />
      <PageContent>
        <Card>
          {isPending ? (
            <LoadingState />
          ) : (
            <EmptyState
              icon={notFound ? <SearchX /> : <TriangleAlert />}
              title={notFound ? notFoundTitle : `${title} konnte nicht geladen werden`}
              description={notFound ? 'Möglicherweise wurde der Eintrag gelöscht.' : errorMessage(error)}
              action={<ButtonLink to={back}>{backLabel}</ButtonLink>}
            />
          )}
        </Card>
      </PageContent>
    </>
  );
}
