import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { List } from './ListItem';
import { LoadingState } from './LoadingState';

interface InfiniteListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** Liste, die beim Scrollen nachlädt, sobald das Ende in Sichtweite kommt (Kap. 7.5). */
export function InfiniteList<T>({
  items,
  getKey,
  renderItem,
  hasMore,
  loadingMore,
  onLoadMore,
}: InfiniteListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return;
    // Neu beobachten nach jedem Ladevorgang: Ist das Ende noch sichtbar, wird direkt weitergeladen
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <>
      <List>
        {items.map((item) => (
          <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
        ))}
      </List>
      {hasMore && (
        <div ref={sentinelRef}>{loadingMore && <LoadingState label="Weitere werden geladen …" />}</div>
      )}
    </>
  );
}
