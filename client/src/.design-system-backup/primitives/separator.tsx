/**
 * Separator Component - UNIFIED & TOKEN-BASED
 * 
 * ✅ Uses design tokens
 * ✅ Horizontal and vertical orientation
 * ✅ Proper accessibility attributes
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
        'shrink-0',
        'bg-[hsl(var(--color-border))]',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

export default Separator;