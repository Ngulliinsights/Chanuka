import React, { useMemo, useRef, useEffect } from 'react';
import { SECTION_ORDER } from '../constants';
import { useNav } from '../hooks/useNav';
import { NavSection } from './NavSection';

export const DesktopSidebar = React.memo(() => {
  const { items, user_role, isAuthenticated } = useNav();
  const prevStateRef = useRef({ items, user_role, isAuthenticated });
  const stableItemsRef = useRef(items);
  
  // Memoize filtered sections to prevent unnecessary re-renders during navigation transitions
  const sectionItems = useMemo(() => {
    // Only update if items actually changed (not just reference)
    const currentState = { items, user_role, isAuthenticated };
    const hasStateChanged = (
      prevStateRef.current.items !== items ||
      prevStateRef.current.user_role !== user_role ||
      prevStateRef.current.isAuthenticated !== isAuthenticated
    );
    
    if (hasStateChanged) {
      prevStateRef.current = currentState;
      stableItemsRef.current = items;
    }
    
    // Use stable reference to prevent filtering on every render
    const stableItems = stableItemsRef.current;
    
    return SECTION_ORDER.map((section) => ({
      section,
      items: stableItems.filter((item) => item.section === section)
    }));
  }, [items, user_role, isAuthenticated]);
  
  // Track component mount state to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return (
    <aside className="chanuka-sidebar chanuka-sidebar-expanded">
      <nav className="p-4">
        {sectionItems.map(({ section, items: sectionItemList }) => (
          <NavSection
            key={section}
            section={section}
            items={sectionItemList}
          />
        ))}
      </nav>
    </aside>
  );
});

