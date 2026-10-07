import { FileText, Plus, SearchX, Settings, TriangleAlert } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDocuments } from '../api/documents';
import { useTags } from '../api/tags';
import { TagFilterBar } from '../components/chips';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  InfiniteList,
  LoadingState,
  SearchInput,
  Stack,
} from '../components/ui';
import { DocumentListItem } from '../features/documents/DocumentListItem';
import { NewDocumentDialog } from '../features/documents/NewDocumentDialog';
import { useDocumentFilter } from '../features/documents/useDocumentFilter';
import { usePageTitle } from '../hooks/usePageTitle';
import { errorMessage } from '../lib/errors';
import styles from './DocumentsPage.module.css';

/** Dokumentliste mit Volltextsuche, Tag-Filter und Nachladen beim Scrollen (Kap. 7.4.3). */
export function DocumentsPage() {
  usePageTitle('Dokumente');
  const filter = useDocumentFilter();
  const { data: allTags = [] } = useTags('documents');
  const documents = useDocuments({ q: filter.q, tags: filter.tags });
  const [creating, setCreating] = useState(false);
  const { fetchNextPage } = documents;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const items = documents.data?.pages.flatMap((page) => page.items) ?? [];
  const newButton = (
    <Button icon={<Plus />} onClick={() => setCreating(true)}>
      Neues Dokument
    </Button>
  );

  let content;
  if (documents.isPending) {
    content = <LoadingState />;
  } else if (documents.error) {
    content = (
      <EmptyState
        icon={<TriangleAlert />}
        title="Dokumente konnten nicht geladen werden"
        description={errorMessage(documents.error)}
      />
    );
  } else if (items.length === 0 && filter.active) {
    content = (
      <EmptyState
        icon={<SearchX />}
        title="Keine Treffer"
        description="Für diese Suche bzw. Tag-Auswahl gibt es keine Dokumente."
        action={<Button onClick={filter.reset}>Filter zurücksetzen</Button>}
      />
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState
        icon={<FileText />}
        title="Noch keine Dokumente"
        description="Hier erscheinen die gespeicherten Dokumente, neueste zuerst."
        action={newButton}
      />
    );
  } else {
    content = (
      <InfiniteList
        items={items}
        getKey={(document) => document.id}
        renderItem={(document) => <DocumentListItem document={document} />}
        hasMore={documents.hasNextPage}
        loadingMore={documents.isFetchingNextPage}
        onLoadMore={loadMore}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dokumente"
        actions={
          <>
            <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
              Neues Dokument
            </Button>
            <IconButton
              to="/documents/settings"
              icon={<Settings />}
              label="Dokument-Einstellungen"
            />
          </>
        }
      />
      <PageContent>
        <Stack gap={3}>
          <SearchInput
            label="Dokumente durchsuchen"
            placeholder="Titel und Inhalt durchsuchen …"
            value={filter.text}
            onChange={filter.setText}
          />
          <TagFilterBar tags={allTags} selected={filter.tags} onChange={filter.setTags} />
        </Stack>
        <Card padded={false}>
          {/* Während neue Treffer laden, bleiben die bisherigen gedimmt sichtbar */}
          <div className={styles.results} aria-busy={documents.isPlaceholderData || undefined}>
            {content}
          </div>
        </Card>
      </PageContent>
      <NewDocumentDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
