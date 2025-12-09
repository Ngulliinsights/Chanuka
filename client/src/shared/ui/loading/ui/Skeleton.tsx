import { SkeletonProps } from '@client/types';
import React from 'react';

import { cn } from '@/lib/utils';

export const Skeleton: React.FC<SkeletonProps> = ({
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
};

export default Skeleton;

