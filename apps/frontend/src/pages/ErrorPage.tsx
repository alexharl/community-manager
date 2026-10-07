import { TriangleAlert } from 'lucide-react';
import { useRouteError } from 'react-router';
import { PageContent } from '../components/layout/PageContent';
import { Button, EmptyState } from '../components/ui';
import { errorMessage } from '../lib/errors';

/** Fängt unerwartete Fehler beim Rendern einer Route ab. */
export function ErrorPage() {
  const error = useRouteError();

  return (
    <PageContent>
      <EmptyState
        icon={<TriangleAlert />}
        title="Etwas ist schiefgelaufen"
        description={errorMessage(error)}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Seite neu laden
          </Button>
        }
      />
    </PageContent>
  );
}
