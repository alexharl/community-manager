import { cx } from '../../lib/cx';
import styles from './CommunityLogo.module.css';

interface CommunityLogoProps {
  url: string | null;
  name: string;
  size?: 'sm' | 'lg';
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

/** Logo der Community; ohne hinterlegtes Logo ein Platzhalter mit Initialen. */
export function CommunityLogo({ url, name, size = 'sm' }: CommunityLogoProps) {
  if (url) {
    // Name steht immer daneben, daher dekorativ
    return <img src={url} alt="" className={cx(styles.logo, styles[size])} />;
  }
  return (
    <span className={cx(styles.placeholder, styles[size])} aria-hidden>
      {initials(name)}
    </span>
  );
}
