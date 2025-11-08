import { SECTION_TITLES } from '../constants';
import type { NavigationItem, NavigationSection } from '../types';
import { NavLink } from './NavLink';

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
        {items.map((it) => (
          <NavLink key={it.id} to={it.href} icon={it.icon}>
            {it.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

