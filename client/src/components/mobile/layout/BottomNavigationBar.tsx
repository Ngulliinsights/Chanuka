/**
 * BottomNavigationBar Component
 * 
 * Navigation bar fixed at the bottom of mobile screens.
 * Typically contains 4-5 main navigation items.
 * 
 * @component
 * @example
 * ```tsx
 * import { BottomNavigationBar } from '@/components/mobile/layout';
 * 
 * export function App() {
 *   return (
 *     <MobileLayout navigationBar={<BottomNavigationBar />}>
 *       <YourContent />
 *     </MobileLayout>
 *   );
 * }
 * ```
 */

import React from 'react';
import { MOBILE_BOTTOM_NAVIGATION } from '@/config/navigation';
import type { NavigationItem } from '@/config/navigation';

interface BottomNavigationBarProps {
  items?: NavigationItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  className?: string;
}

/**
 * BottomNavigationBar Component
 * 
 * Fixed bottom navigation with 4-5 items.
 */
export const BottomNavigationBar = React.forwardRef<HTMLDivElement, BottomNavigationBarProps>(
  ({ items = MOBILE_BOTTOM_NAVIGATION, activeId, onNavigate, className }, ref) => {
    return (
      <div ref={ref} className={`bottom-navigation-bar ${className || ''}`}>
        {/* Component implementation will be added here */}
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeId === item.id ? 'active' : ''}`}
            onClick={() => onNavigate?.(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }
);

BottomNavigationBar.displayName = 'BottomNavigationBar';

export default BottomNavigationBar;
