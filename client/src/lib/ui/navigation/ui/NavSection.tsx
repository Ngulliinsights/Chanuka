import { Building, FileText, Users, Shield, Search, User, Settings, BarChart3 } from 'lucide-react';
import React from 'react';

import type { NavigationItem, NavigationSection } from '@client/lib/types';

import { SECTION_TITLES } from '../constants';

import { NavLink } from './NavLink';

// Icon mapping for string to component conversion
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building,
  FileText,
  Users,
  Shield,
  Search,
  User,
  Settings,
  BarChart3,
};

interface Props {
  section: NavigationSection;
  items: NavigationItem[];
}

export const NavSection = ({ section, items }: Props) => {
  if (!items.length) return null;

  return (
    <div className="mb-6">
      <h3 className="chanuka-nav-section-title">{SECTION_TITLES[section]}</h3>
      <div className="space-y-1">
        {items.map(it => {
          const IconComponent =
            it.icon && typeof it.icon === 'string' ? ICON_MAP[it.icon] : undefined;
          return (
            <NavLink key={it.id} to={it.href} icon={IconComponent}>
              {it.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
