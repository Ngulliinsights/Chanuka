/**
 * Separator Component
 * Visual separator for content sections
 */

import React from 'react';

import { cn } from '@client/lib/utils';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <div
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

export default Separator;