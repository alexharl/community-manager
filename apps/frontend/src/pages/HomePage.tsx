import { Link } from 'react-router';
import { useSettings } from '../api/settings';
import { SECTION_ITEMS } from '../app/navigation';
import { PageContent } from '../components/layout/PageContent';
import { CommunityLogo } from '../features/settings/CommunityLogo';
import { usePageTitle } from '../hooks/usePageTitle';
import styles from './HomePage.module.css';

export function HomePage() {
  usePageTitle();
  const { data: settings } = useSettings();

  return (
    <PageContent>
      <div className={styles.hero}>
        {settings && (
          <>
            <CommunityLogo url={settings.logoUrl} name={settings.communityName} size="lg" />
            <h1 className={styles.name}>{settings.communityName}</h1>
          </>
        )}
      </div>
      <nav className={styles.tiles} aria-label="Bereiche">
        {SECTION_ITEMS.map(({ to, label, description, icon: Icon }) => (
          <Link key={to} to={to} className={styles.tile}>
            <Icon className={styles.tileIcon} aria-hidden />
            <span className={styles.tileTitle}>{label}</span>
            <span className={styles.tileDescription}>{description}</span>
          </Link>
        ))}
      </nav>
    </PageContent>
  );
}
