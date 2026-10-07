import type { Template } from '@cm/shared';
import { LayoutTemplate, Mail, TriangleAlert } from 'lucide-react';
import { TagList } from '../../components/chips';
import { ListItem, StatusBadge } from '../../components/ui';
import styles from './TemplateListItem.module.css';

export function TemplateListItem({ template }: { template: Template }) {
  const { mail, tags } = template;
  const accountMissing = mail.enabled && !mail.accountId;

  return (
    <ListItem
      icon={<LayoutTemplate />}
      title={template.name}
      to={`/documents/templates/${template.id}`}
      subtitle={
        tags.length > 0 || mail.enabled ? (
          <>
            <TagList tags={tags} />
            {mail.enabled && (
              <span className={styles.mail}>
                <Mail aria-hidden />
                Mailversand
              </span>
            )}
          </>
        ) : undefined
      }
      meta={
        accountMissing ? (
          <StatusBadge tone="warning" icon={<TriangleAlert />}>
            {mail.accountDeleted ? 'Mail-Konto gelöscht' : 'Kein Mail-Konto'}
          </StatusBadge>
        ) : undefined
      }
    />
  );
}
