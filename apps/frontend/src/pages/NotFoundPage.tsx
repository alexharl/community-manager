import { SearchX } from 'lucide-react';
import { PageContent } from '../components/layout/PageContent';
import { ButtonLink, EmptyState } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Nicht gefunden');

  return (
    <PageContent>
      <EmptyState
        icon={<SearchX />}
        title="Seite nicht gefunden"
        description="Die aufgerufene Adresse gibt es nicht."
        action={<ButtonLink to="/">Zur Startseite</ButtonLink>}
      />
    </PageContent>
  );
}
