import { BarChart3, CalendarDays, House, Settings, type LucideIcon } from 'lucide-react';
import { de } from '@/lib/i18n/de';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: readonly NavItem[] = [
  { to: '/', label: de.nav.today, icon: House },
  { to: '/verlauf', label: de.nav.history, icon: CalendarDays },
  { to: '/statistik', label: de.nav.stats, icon: BarChart3 },
  { to: '/einstellungen', label: de.nav.settings, icon: Settings },
];
