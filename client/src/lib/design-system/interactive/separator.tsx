import React from 'react';

export const Separator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={'shrink-0 bg-border ' + (className || '')} {...props} />
  )
);
Separator.displayName = 'Separator';
