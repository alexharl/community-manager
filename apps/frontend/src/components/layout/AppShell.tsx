import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useSettings } from '../../api/settings';
import { NAV_ITEMS } from '../../app/navigation';
import { CommunityLogo } from '../../features/settings/CommunityLogo';
import { useFavicon } from '../../hooks/useFavicon';
import { cx } from '../../lib/cx';
import { IconButton } from '../ui';
import styles from './AppShell.module.css';

/** Grundlayout: Seitenleiste mit Logo und Menü, rechts die aktuelle Seite (Spezifikation Kap. 7.3). */
export function AppShell() {
  const { data: settings } = useSettings();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);
  const name = settings?.communityName ?? '';

  useFavicon(settings?.logoUrl ?? null);

  return (
    <div className={styles.shell}>
      <aside className={cx(styles.sidebar, navOpen && styles.open)}>
        <Link to="/" className={styles.brand} onClick={closeNav}>
          {settings && <CommunityLogo url={settings.logoUrl} name={name} />}
          <span className={styles.brandName}>{name}</span>
        </Link>
        <nav className={styles.nav} aria-label="Hauptmenü">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeNav}
              className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
            >
              <Icon aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {navOpen && <div className={styles.backdrop} onClick={closeNav} />}

      <div className={styles.main}>
        <div className={styles.mobileBar}>
          <IconButton icon={<Menu />} label="Menü öffnen" onClick={() => setNavOpen(true)} />
          <span className={styles.brandName}>{name}</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
