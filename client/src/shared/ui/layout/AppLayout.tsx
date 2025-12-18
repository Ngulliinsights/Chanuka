import React from 'react';

import { cn } from '../../design-system/utils/cn';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * Application layout wrapper component
 * Provides consistent structure for app pages
 */
export function AppLayout({
  children,
  className,
  'data-testid': testId
}: AppLayoutProps) {
  return (
    <div
      className={cn("min-h-screen bg-background", className)}
      data-testid={testId}
    >
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;