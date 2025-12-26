import React from 'react';
import { SkeletonProps } from '../types';
import { cn } from '@client/shared/design-system/lib/utils';

export const Skeleton = React.memo<SkeletonProps>(({
  className,
  width,
  height,
  ...props
}) => {
  const style: React.CSSProperties = {
    ...(width && { width }),
    ...(height && { height }),
  };

  return (
    <div
      className={cn('chanuka-skeleton', className)}
      style={style}
      role="presentation"
      aria-hidden="true"
      {...props}
    />
  );
});

export default Skeleton;

