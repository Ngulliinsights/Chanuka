import { Link, LinkProps } from 'react-router-dom';
import { clsx } from 'clsx';
import React from 'react';

interface NavLinkProps extends LinkProps {
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ isActive, icon: Icon, children, className, ...rest }, ref) => (
    <Link
      ref={ref}
      {...rest}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition',
        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </Link>
  )
);

