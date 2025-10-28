import { SECTION_ORDER } from '../constants';
import { useNav } from '../hooks/useNav';
import { NavSection } from './NavSection';

export const DesktopSidebar = () => {
  const { items } = useNav();
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-white">
      <nav className="p-4">
        {SECTION_ORDER.map((sec) => (
          <NavSection key={sec} section={sec} items={items.filter((i) => i.section === sec)} />
        ))}
      </nav>
    </aside>
  );
};

