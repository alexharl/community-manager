import type { Dispatch, DispatchGroup, DispatchGroupState } from '@cm/shared';
import { ArrowRight, Check, Send, TriangleAlert } from 'lucide-react';
import { Button, StatusBadge, type ButtonVariant } from '../../components/ui';
import { cx } from '../../lib/cx';
import { formatDateTime } from '../../lib/format';
import styles from './DispatchGroupItem.module.css';

/** Beschriftung der Aktion je Zustand (Kap. 5.6); „pending“ hat keine Aktion. */
const DISPATCH_ACTIONS: Record<
  DispatchGroupState,
  { label: string; variant: ButtonVariant } | null
> = {
  new: { label: 'Dokument versenden', variant: 'primary' },
  outdated: { label: 'Erneut versenden', variant: 'primary' },
  failed: { label: 'Erneut versuchen', variant: 'secondary' },
  current: { label: 'Nochmals senden', variant: 'ghost' },
  pending: null,
};

function GroupBadge({ group, version }: { group: DispatchGroup; version: number }) {
  switch (group.state) {
    case 'pending':
      return (
        <StatusBadge tone="info" loading>
          Wird versendet …
        </StatusBadge>
      );
    case 'current':
      return (
        <StatusBadge tone="success" icon={<Check />}>
          Versendet
        </StatusBadge>
      );
    case 'outdated':
      return (
        <StatusBadge tone="warning" icon={<TriangleAlert />}>
          Neue Version (v{version}) – zuletzt v{group.lastSentVersion} versendet
        </StatusBadge>
      );
    case 'failed':
      return <StatusBadge tone="danger">Fehlgeschlagen</StatusBadge>;
    default:
      return <StatusBadge>Noch nicht versendet</StatusBadge>;
  }
}

function DispatchEntry({ dispatch }: { dispatch: Dispatch }) {
  return (
    <li className={styles.entry}>
      <span>
        {formatDateTime(dispatch.createdAt)} · Version {dispatch.documentVersion} ·{' '}
      </span>
      {dispatch.status === 'sent' && <span className={styles.sent}>versendet</span>}
      {dispatch.status === 'pending' && <span>wird versendet …</span>}
      {dispatch.status === 'failed' && (
        <span className={styles.failed}>fehlgeschlagen: {dispatch.error}</span>
      )}
      {dispatch.introText && <span> · mit Begleittext</span>}
      {dispatch.rejectedAddresses.length > 0 && (
        <span className={styles.rejected}>
          {' '}
          · abgelehnt: {dispatch.rejectedAddresses.join(', ')}
        </span>
      )}
    </li>
  );
}

interface DispatchGroupItemProps {
  group: DispatchGroup;
  /** Aktuelle Dokumentversion. */
  version: number;
  /** Nur für die aktive Gruppe. */
  onAction?: () => void;
  /** Grund, warum die Aktion gerade nicht möglich ist (wird als Tooltip gezeigt). */
  blockedReason?: string | null;
}

/** Eine Versandgruppe: Absender → Empfängerliste, Zustand, ggf. Aktion und Versandhistorie. */
export function DispatchGroupItem({
  group,
  version,
  onAction,
  blockedReason,
}: DispatchGroupItemProps) {
  const action = onAction ? DISPATCH_ACTIONS[group.state] : null;

  return (
    <div className={cx(styles.group, group.active && styles.active)}>
      <div className={styles.header}>
        <div className={styles.route}>
          <span className={styles.address}>{group.from}</span>
          <ArrowRight className={styles.arrow} aria-label="an" />
          <span className={styles.address}>{group.to.join(', ')}</span>
        </div>
        <div className={styles.status}>
          <GroupBadge group={group} version={version} />
          {action && (
            <Button
              size="sm"
              variant={action.variant}
              icon={<Send />}
              disabled={Boolean(blockedReason)}
              title={blockedReason ?? undefined}
              onClick={onAction}
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
      {group.dispatches.length > 0 && (
        <ul className={styles.entries}>
          {group.dispatches.map((dispatch) => (
            <DispatchEntry key={dispatch.id} dispatch={dispatch} />
          ))}
        </ul>
      )}
    </div>
  );
}
