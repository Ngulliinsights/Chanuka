import React from 'react';

import { cn } from '@client/lib/design-system/lib/utils';

import { SkeletonProps } from '../types';

export const Skeleton = React.memo<SkeletonProps>(({ className, width, height, ...props }) => {
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
