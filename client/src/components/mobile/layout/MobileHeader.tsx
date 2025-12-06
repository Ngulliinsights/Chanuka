/**
 * MobileHeader Component
 * 
 * Minimal header component for mobile pages.
 * Typically contains title, logo, and action buttons.
 * 
 * @component
 * @example
 * ```tsx
 * import { MobileHeader } from '@/components/mobile/layout';
 * 
 * export function MyPage() {
 *   return (
 *     <MobileLayout header={<MobileHeader title="My Page" />}>
 *       <Content />
 *     </MobileLayout>
 *   );
 * }
 * ```
 */

import React from 'react';

interface MobileHeaderProps {
  title?: string;
  logo?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * MobileHeader Component
 * 
 * Simple header with title and action slots.
 */
export const MobileHeader = React.forwardRef<HTMLDivElement, MobileHeaderProps>(
  ({ title, logo, leftAction, rightAction, className }, ref) => {
    return (
      <div ref={ref} className={`mobile-header-wrapper ${className || ''}`}>
        <div className="header-left">
          {logo && <div className="logo">{logo}</div>}
          {leftAction && <div className="action">{leftAction}</div>}
        </div>
        
        {title && <div className="header-title">{title}</div>}
        
        <div className="header-right">
          {rightAction && <div className="action">{rightAction}</div>}
        </div>
      </div>
    );
  }
);

MobileHeader.displayName = 'MobileHeader';

export default MobileHeader;
