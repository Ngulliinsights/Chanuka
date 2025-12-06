import React, { useMemo, useCallback } from 'react';
import { Grid as FixedSizeGrid } from 'react-virtualized';

import { Bill } from '@client/features/bills/model/types';
import { cn } from '@client/lib/utils';

import { BillCard } from './BillCard';

interface VirtualBillGridProps {
  bills: Bill[];
  onSave?: (billId: string) => void;
  onShare?: (billId: string) => void;
  onComment?: (billId: string) => void;
  savedBills?: Set<string>;
  className?: string;
  height?: number;
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
  savedBills = new Set(),
  className,
  height = 600,
}: VirtualBillGridProps) {
  // Calculate responsive columns based on container width
  const getColumnsPerRow = useCallback((containerWidth: number) => {
    if (containerWidth >= 1200) return 3; // Desktop: 3 columns
    if (containerWidth >= 768) return 2;  // Tablet: 2 columns
    return 1; // Mobile: 1 column
  }, []);


  // Handle window resize for responsive columns
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Recalculate grid when window width changes
  const responsiveGridData = useMemo(() => {
    const containerWidth = windowWidth - 64; // Account for padding
    const columnsPerRow = getColumnsPerRow(containerWidth);
    const rowCount = Math.ceil(bills.length / columnsPerRow);
    const columnWidth = Math.floor(containerWidth / columnsPerRow);
    const rowHeight = 320;

    return {
      columnsPerRow,
      rowCount,
      columnWidth,
      rowHeight,
      containerWidth,
    };
  }, [bills.length, windowWidth, getColumnsPerRow]);

  const responsiveItemData = useMemo(() => ({
    bills,
    columnsPerRow: responsiveGridData.columnsPerRow,
    onSave,
    onShare,
    onComment,
    savedBills,
  }), [bills, responsiveGridData.columnsPerRow, onSave, onShare, onComment, savedBills]);

  if (bills.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">No bills found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <FixedSizeGrid
        cellRenderer={({ columnIndex, rowIndex, key, style }) => (
          <GridItem
            key={key}
            columnIndex={columnIndex}
            rowIndex={rowIndex}
            style={style}
            data={responsiveItemData}
          />
        )}
        columnCount={responsiveGridData.columnsPerRow}
        columnWidth={responsiveGridData.columnWidth}
        height={height}
        rowCount={responsiveGridData.rowCount}
        rowHeight={responsiveGridData.rowHeight}
        width={responsiveGridData.containerWidth}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      />
    </div>
  );
}

// Non-virtual fallback for smaller datasets
export function BillGrid({
  bills,
  onSave,
  onShare,
  onComment,
  savedBills = new Set(),
  className,
  viewMode = 'grid',
}: Omit<VirtualBillGridProps, 'height'> & { viewMode?: 'grid' | 'list' }) {
  if (bills.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">No bills found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        : "space-y-4",
      className
    )}>
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          onSave={onSave}
          onShare={onShare}
          onComment={onComment}
          isSaved={savedBills.has(bill.id)}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}