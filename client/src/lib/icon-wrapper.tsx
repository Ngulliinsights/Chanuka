import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/browser-logger';

interface IconWrapperProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function wrapIcon(Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>) {
  const WrappedIcon = forwardRef<SVGSVGElement, IconWrapperProps>(
    ({ className, ...props }, ref) => {
      return (
        <Icon
          ref={ref}
          className={cn('h-6 w-6', className)}
          {...props}
        />
      );
    }
  );
  
  WrappedIcon.displayName = `Wrapped${Icon.displayName || 'Icon'}`;
  return WrappedIcon;
}
