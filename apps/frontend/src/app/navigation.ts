import { FileText, House, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Nur bei exakter Übereinstimmung aktiv (für „/“). */
  end?: boolean;
}

/** Hauptmenü der Seitenleiste; die Bereiche erscheinen zusätzlich als Kacheln auf der Startseite. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Start', description: 'Übersicht', icon: House, end: true },
  {
    to: '/documents',
    label: 'Dokumente',
    description: 'Protokolle erstellen, ablegen und versenden',
    icon: FileText,
  },
  {
    to: '/settings',
    label: 'Einstellungen',
    description: 'Name, Logo, Darstellung und Mail-Konten',
    icon: Settings,
  },
];

export const SECTION_ITEMS = NAV_ITEMS.filter((item) => item.to !== '/');
