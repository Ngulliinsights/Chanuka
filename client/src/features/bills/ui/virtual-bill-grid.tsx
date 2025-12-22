import React from 'react';
import { Bill } from '../model/types';
import { cn } from '@client/lib/utils';

import { BillCard } from './BillCard';

interface VirtualBillGridProps {
  bills: Bill[];
  onSave?: (billId: string) => void;
  onShare?: (billId: string) => void;
  onComment?: (billId: string) => void;
  savedBills?: Set<string>;
  className?: string;
  viewMode?: string;
}

/**
 * VirtualBillGrid - Renders a responsive grid of bill cards
 * 
 * This component displays bills in a CSS Grid layout that automatically
 * adjusts columns based on screen size (1 column on mobile, 2 on tablet,
 * 3 on desktop). For large datasets, consider implementing virtualization
 * with react-window or react-virtualized to improve performance.
 */
export function VirtualBillGrid({
  bills,
  onSave,
  onShare,
  onComment,
  savedBills,
  className,
}: VirtualBillGridProps) {
  // Handle empty state gracefully with helpful messaging
  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No bills found</p>
        <p className="text-gray-400 text-sm mt-2">
          Try adjusting your search criteria or filters
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bills-grid',
        // Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className
      )}
    >
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          // Wrap callbacks to pass bill ID to parent handlers
          onSave={() => onSave?.(bill.id)}
          onShare={() => onShare?.(bill.id)}
          onComment={() => onComment?.(bill.id)}
          isSaved={savedBills?.has(bill.id)}
          viewMode="grid"
        />
      ))}
    </div>
  );
}
const defaultExport = {};
export default defaultExport;
