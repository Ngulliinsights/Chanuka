import React, { useRef, useEffect } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { LazyExoticComponent, ComponentType } from 'react';
import { useRoutePreloader } from '@/utils/route-preloading';
import { useAdaptiveLoading } from '@/hooks/useConnectionAware';
import { cn } from '@/lib/utils';

export interface PreloadLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
  component?: LazyExoticComponent<ComponentType<any>>;
  preloadOn?: 'hover' | 'visible' | 'immediate' | 'none';
  priority?: 'high' | 'medium' | 'low';
  children: React.ReactNode;
  className?: string;
}

export const PreloadLink: React.FC<PreloadLinkProps> = ({
  to,
  component,
  preloadOn = 'hover',
  priority = 'medium',
  children,
  className,
  ...linkProps
}) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { preloadRoute, preloadOnHover, preloadOnVisible } = useRoutePreloader();
  const { shouldPreload } = useAdaptiveLoading();

  useEffect(() => {
    if (!component || !shouldPreload(priority)) {
      return;
    }

    const element = linkRef.current;
    if (!element) return;

    let cleanup: (() => void) | undefined;

    switch (preloadOn) {
      case 'immediate':
        preloadRoute(component, to);
        break;
      
      case 'hover':
        cleanup = preloadOnHover(component, to)(element);
        break;
      
      case 'visible':
        cleanup = preloadOnVisible(component, to)(element);
        break;
      
      case 'none':
      default:
        break;
    }

    return cleanup;
  }, [component, to, preloadOn, priority, preloadRoute, preloadOnHover, preloadOnVisible, shouldPreload]);

  return (
    <Link
      ref={linkRef}
      to={to}
      className={cn(className)}
      {...linkProps}
    >
      {children}
    </Link>
  );
};

// Specialized navigation link for main navigation
export interface NavLinkProps extends PreloadLinkProps {
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const NavLink: React.FC<NavLinkProps> = ({
  isActive = false,
  icon: Icon,
  badge,
  children,
  className,
  ...preloadLinkProps
}) => {
  return (
    <PreloadLink
      className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        className
      )}
      {...preloadLinkProps}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
      {badge && (
        <span className="ml-auto bg-muted-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </PreloadLink>
  );
};

// Button-style preload link
export interface PreloadButtonProps extends PreloadLinkProps {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const PreloadButton: React.FC<PreloadButtonProps> = ({
  variant = 'default',
  size = 'md',
  className,
  ...preloadLinkProps
}) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 py-2 text-sm',
    lg: 'h-10 px-8 text-base',
  };

  return (
    <PreloadLink
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...preloadLinkProps}
    />
  );
};

// Card-style preload link for dashboard items
export interface PreloadCardProps extends PreloadLinkProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const PreloadCard: React.FC<PreloadCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  className,
  children,
  ...preloadLinkProps
}) => {
  return (
    <PreloadLink
      className={cn(
        'block p-4 border rounded-lg hover:bg-muted/50 transition-colors',
        className
      )}
      {...preloadLinkProps}
    >
      <div className="flex items-start space-x-3">
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground truncate">
              {title}
            </h3>
            {badge && (
              <span className="ml-2 bg-muted-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </PreloadLink>
  );
};