import React from 'react';

import { cn } from '@/shared/design-system/utils/cn';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function SafeAreaWrapper({ children, className, edges = ['top', 'right', 'bottom', 'left'] }: SafeAreaWrapperProps): JSX.Element {
  const safeAreaClasses = edges.map(edge => `safe-area-inset-${edge}`).join(' ');

  return (
    <div className={cn('safe-area-wrapper', safeAreaClasses, className)}>
      {children}
    </div>
  );
}
