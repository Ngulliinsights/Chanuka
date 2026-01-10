import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

import { cn } from '@client/shared/utils/cn';

interface NavLinkProps extends LinkProps {
  is_active?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ is_active, icon: Icon, children, className, ...rest }, ref) => (
    <Link
      ref={ref}
      {...rest}
      className={cn('chanuka-nav-item', is_active && 'chanuka-nav-item.active', className)}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </Link>
  )
);

NavLink.displayName = 'NavLink';
