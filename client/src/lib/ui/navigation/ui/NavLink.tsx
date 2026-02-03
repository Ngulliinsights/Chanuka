import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

import { cn } from '@client/lib/utils/cn';

interface NavLinkProps extends LinkProps {
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ isActive, icon: Icon, children, className, ...rest }, ref) => (
    <Link
      ref={ref}
      {...rest}
      className={cn('chanuka-nav-item', isActive && 'chanuka-nav-item.active', className)}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </Link>
  )
);

NavLink.displayName = 'NavLink';
