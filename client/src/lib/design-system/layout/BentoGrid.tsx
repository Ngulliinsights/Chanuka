import React from 'react';
import { cn } from '@client/lib/design-system/utils/cn';

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article';
}

export interface BentoItemProps {
  children: React.ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  onClick?: () => void;
  'aria-label'?: string;
}

/**
 * BentoGrid Component
 * 
 * A responsive grid layout system for dashboard widgets and content areas.
 * Automatically adjusts columns based on screen size.
 * 
 * @param cols - Number of columns (1-4, default: 3)
 * @param gap - Spacing between items ('sm' | 'md' | 'lg', default: 'md')
 * @param as - HTML element to render as (default: 'div')
 * 
 * @example
 * <BentoGrid cols={3} gap="lg">
 *   <BentoItem span={2}>Wide content</BentoItem>
 *   <BentoItem>Regular content</BentoItem>
 * </BentoGrid>
 */
export const BentoGrid = React.memo<BentoGridProps>(({
  children,
  className,
  cols = 3,
  gap = 'md',
  as: Component = 'div',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <Component
      className={cn(
        'grid w-full',
        gapClasses[gap],
        colClasses[cols],
        className
      )}
    >
      {children}
    </Component>
  );
});

BentoGrid.displayName = 'BentoGrid';

/**
 * BentoItem Component
 * 
 * Individual item within a BentoGrid.
 * Supports flexible spanning and automatic hover effects.
 * 
 * @param span - Column span (1-4, default: 1)
 * @param rowSpan - Row span (1-4, default: 1)
 * @param onClick - Optional click handler (makes item interactive)
 */
export const BentoItem = React.memo<BentoItemProps>(({
  children,
  className,
  span = 1,
  rowSpan = 1,
  onClick,
  'aria-label': ariaLabel,
}) => {
  const isInteractive = Boolean(onClick);

  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 sm:col-span-2',
    3: 'col-span-1 sm:col-span-2 lg:col-span-3',
    4: 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4',
  };

  const rowSpanClasses = {
    1: 'row-span-1',
    2: 'row-span-1 md:row-span-2',
    3: 'row-span-1 md:row-span-3',
    4: 'row-span-1 md:row-span-4',
  };

  return (
    <div
      className={cn(
        'glass-panel rounded-xl overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-0.5',
        spanClasses[span as keyof typeof spanClasses],
        rowSpanClasses[rowSpan as keyof typeof rowSpanClasses],
        isInteractive && 'cursor-pointer hover:shadow-xl active:scale-[0.99]',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
});

BentoItem.displayName = 'BentoItem';

export default BentoGrid;