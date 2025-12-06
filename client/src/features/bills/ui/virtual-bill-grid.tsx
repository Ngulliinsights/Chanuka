import React, { useMemo, useCallback } from 'react';
import { Grid as FixedSizeGrid } from 'react-virtualized';

import { Bill } from '@client/features/bills/model/types';
import { cn } from '@client/lib/utils';
import { DemoBill } from '@client/services/realistic-demo-data';

import { BillCard } from './BillCard';

interface VirtualBillGridProps {
  bills: Bill[];
  onSave?: (billId: string) => void;
  onShare?: (billId: string) => void;
  onComment?: (billId: string) => void;
  savedBills?: Set<string>;
  className?: string;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    bills: Bill[];
    columnsPerRow: number;
    onSave?: (billId: string) => void;
    onShare?: (billId: string) => void;
    onComment?: (billId: string) => void;
    savedBills?: Set<string>;
  };
}

const GridItem = ({ columnIndex, rowIndex, style, data }: GridItemProps) => {
  const { bills, columnsPerRow, onSave, onShare, onComment, savedBills } = data;
  const billIndex = rowIndex * columnsPerRow + columnIndex;
  const bill = bills[billIndex];

  if (!bill) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="p-2">
      <BillCard
        bill={bill}
        onSave={onSave}
        onShare={onShare}
        onComment={onComment}
        isSaved={savedBills?.has(bill.id)}
        viewMode="grid"
      />
    </div>
  );
};

export function VirtualBillGrid({
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