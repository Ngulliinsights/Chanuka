import React from 'react';
import { cn } from '../../design-system/utils/cn';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Main application layout component
 * Provides consistent structure across all pages
 */
export default function Layout({ 
  children, 
  className, 
  sidebar, 
  header, 
  footer 
}: LayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {header && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      )}
      
      <div className="flex flex-1">
        {sidebar && (
          <aside className="w-64 border-r bg-background">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      
      {footer && (
        <footer className="border-t bg-background">
          {footer}
        </footer>
      )}
    </div>
  );
}