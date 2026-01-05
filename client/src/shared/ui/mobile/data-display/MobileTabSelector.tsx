/**
 * MobileTabSelector Component
 *
 * Tab navigation component optimized for mobile.
 * Swipeable and touch-friendly tab switching.
 *
 * @component
 * @example
 * ```tsx
 * import { MobileTabSelector, useMobileTabs } from '@client/shared/ui/mobile/data-display';
 *
 * export function TabbedContent() {
 *   const { activeTab, setActiveTab } = useMobileTabs('overview');
 *
 *   return (
 *     <MobileTabSelector
 *       tabs={tabs}
 *       activeTab={activeTab}
 *       onTabChange={setActiveTab}
 *     />
 *   );
 * }
 * ```
 */

import React from 'react';

import type { MobileTab } from '@/shared/types/mobile';

interface MobileTabSelectorProps {
  tabs: MobileTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

/**
 * MobileTabSelector Component
 *
 * Touch-friendly tab navigation.
 */
export const MobileTabSelector = React.forwardRef<HTMLDivElement, MobileTabSelectorProps>(
  ({ tabs, activeTab, onTabChange, className }, ref) => {
    const active = activeTab || tabs[0]?.id;

    return (
      <div ref={ref} className={`mobile-tab-selector ${className || ''}`}>
        <div className="tabs-header">
          {/* Component implementation will be added here */}
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${active === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange?.(tab.id)}
              disabled={tab.disabled}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="tabs-content">
          {tabs.find(tab => tab.id === active)?.content}
        </div>
      </div>
    );
  }
);

MobileTabSelector.displayName = 'MobileTabSelector';

export type { MobileTab };
export default MobileTabSelector;
