/**
 * Theme Toggle Component
 * 
 * Accessible button to switch between light and dark themes
 * Shows moon/sun icons based on current theme
 */

'use client';

import { Moon, Sun } from 'lucide-react';

import { Button } from '@client/components/ui/button';

import { useTheme } from './theme-provider';

export interface ThemeToggleProps {
  /**
   * Show text label alongside icons
   */
  showLabel?: boolean;

  /**
   * Custom className for the button
   */
  className?: string;
}

/**
 * Theme Toggle Button
 * Switches between light and dark themes with accessible labels
 */
export function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-5 w-5" />
          {showLabel && <span className="ml-2 text-sm">Light</span>}
        </>
      ) : (
        <>
          <Moon className="h-5 w-5" />
          {showLabel && <span className="ml-2 text-sm">Dark</span>}
        </>
      )}
      <span className="sr-only">
        Toggle theme (currently {theme})
      </span>
    </Button>
  );
}

export default ThemeToggle;
