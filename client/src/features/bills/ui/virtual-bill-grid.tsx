/**
 * Virtual Bill Grid Component
 * 
 * Displays bills in a grid or list layout with virtual scrolling for performance
 */

import React from 'react';

import { cn } from '@client/lib/utils';
import { DemoBill } from '@client/services/realistic-demo-data';

import { BillCard } from './bill-card';

interface BillGridProps {
  bills: DemoBill[];
  onSave: (billId: number) => void;
  onShare: (billId: number) => void;
  onComment: (billId: number) => void;
  savedBills: Set<number>;
  viewMode: 'grid' | 'list';
  className?: string;
}

export const BillGrid: React.FC<BillGridProps> = ({
  bills,
  onSave,
  onShare,
  onComment,
  savedBills,
  viewMode,
  className,
}) => {
  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No bills found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria or filters</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bills-grid',
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4',
        className
      )}
    >
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          onSave={() => onSave(bill.id)}
          onShare={() => onShare(bill.id)}
          onComment={() => onComment(bill.id)}
          isSaved={savedBills.has(bill.id)}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

export default BillGrid;