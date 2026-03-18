/**
 * Comparison Floating Bar
 *
 * Floating action bar that appears when bills are selected for comparison.
 * Provides quick access to compare and clear actions.
 */

import { GitCompare, X } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { cn } from '@client/lib/design-system/utils/cn';

interface ComparisonFloatingBarProps {
  selectedCount: number;
  onCompare: () => void;
  onClear: () => void;
  className?: string;
}

export function ComparisonFloatingBar({
  selectedCount,
  onCompare,
  onClear,
  className,
}: ComparisonFloatingBarProps) {
  if (selectedCount < 2) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-white dark:bg-gray-800 shadow-2xl rounded-full',
        'px-6 py-3 flex items-center gap-4',
        'border border-gray-200 dark:border-gray-700',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {selectedCount} {selectedCount === 1 ? 'bill' : 'bills'} selected
      </span>

      <Button onClick={onCompare} size="sm" className="gap-2">
        <GitCompare className="w-4 h-4" />
        Compare
      </Button>

      <Button
        onClick={onClear}
        variant="ghost"
        size="sm"
        className="gap-2"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
        Clear
      </Button>
    </div>
  );
}
