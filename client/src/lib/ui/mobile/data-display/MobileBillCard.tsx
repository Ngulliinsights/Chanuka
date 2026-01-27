/**
 * MobileBillCard Component
 *
 * Responsive bill card component optimized for mobile display.
 * Single component that works on all viewport sizes via responsive CSS.
 *
 * @component
 * @example
 * ```tsx
 * import { MobileBillCard } from '@client/lib/ui/mobile/data-display';
 *
 * export function BillsList() {
 *   return (
 *     <div className="grid grid-cols-1 md:grid-cols-2">
 *       {bills.map(bill => (
 *         <MobileBillCard key={bill.id} bill={bill} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import React from 'react';

interface Bill {
  id: string;
  title: string;
  number?: string;
  status?: string;
  [key: string]: any;
}

interface MobileBillCardProps {
  bill: Bill;
  variant?: 'compact' | 'default' | 'detailed';
  onClick?: () => void;
  className?: string;
}

/**
 * MobileBillCard Component
 *
 * Responsive bill card - same component for all screen sizes.
 */
export const MobileBillCard = React.forwardRef<HTMLDivElement, MobileBillCardProps>(
  ({ bill, variant = 'default', onClick, className }, ref) => {
    return (
      <div
        ref={ref}
        className={`mobile-bill-card ${variant} ${className || ''}`}
        onClick={onClick}
        role="article"
      >
        {/* Component implementation will be added here */}
        <div className="card-header">
          <h3 className="bill-title">{bill.title}</h3>
          {bill.number && <span className="bill-number">{bill.number}</span>}
        </div>

        {(variant === 'default' || variant === 'detailed') && bill.status && (
          <div className="card-status">
            <span className={`status-badge ${bill.status}`}>{bill.status}</span>
          </div>
        )}

        <div className="card-content">{/* Additional bill details will be rendered here */}</div>
      </div>
    );
  }
);

MobileBillCard.displayName = 'MobileBillCard';

export default MobileBillCard;
