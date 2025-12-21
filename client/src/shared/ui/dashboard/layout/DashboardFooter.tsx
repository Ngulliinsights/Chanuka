/**
 * Dashboard Footer Component
 *
 * Footer with branding, links, and additional information
 */

import React from 'react';
import { cn } from '@client/shared/design-system';
import { DashboardConfig } from '../types';

interface DashboardFooterProps {
  /** Dashboard configuration */
  config: DashboardConfig;
  /** Custom footer content */
  content?: React.ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * Dashboard Footer Component
 */
export const DashboardFooter = React.memo(<DashboardFooterProps> = ({
  config,
  content,
  className,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        // Base layout
        'w-full',
        'bg-[hsl(var(--color-muted))]',
        'border-t border-[hsl(var(--color-border))]',
        'transition-colors duration-200',

        // Responsive padding
        'px-4 sm:px-6 lg:px-8',
        'py-4 sm:py-6',

        className
      )}
      role="contentinfo"
      aria-label="Dashboard footer"
    >
      <div className="max-w-full mx-auto">
        {/* Custom Content */}
        {content && (
          <div className="mb-4">
            {content}
          </div>
        )}

        {/* Default Footer Content */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Branding */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-[hsl(var(--color-muted-foreground))]">
              © {currentYear} {config.title}. All rights reserved.
            </div>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center space-x-6 text-sm">
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2 rounded-sm"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2 rounded-sm"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2 rounded-sm"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2 rounded-sm"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-[hsl(var(--color-border))]">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-xs text-[hsl(var(--color-muted-foreground))]">
            <div>
              Version 1.0.0
            </div>
            <div className="flex items-center space-x-4">
              <span>Built with ❤️ using React & TypeScript</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
);

function 1(
};

DashboardFooter.displayName = 'DashboardFooter';