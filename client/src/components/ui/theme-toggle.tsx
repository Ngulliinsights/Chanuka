import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export function ThemeToggle({
  variant = 'dropdown',
  size = 'default',
  className = ''
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4" />,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4" />,
    },
    {
      value: 'system',
      label: 'System',
      icon: <Monitor className="h-4 w-4" />,
    },
  ];

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        className={`relative ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const currentTheme = themes.find(t => t.value === theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={`relative ${className}`}
          aria-label="Select theme"
        >
          {currentTheme?.icon}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ value, label, icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2"
          >
            {icon}
            <span>{label}</span>
            {theme === value && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple toggle button component for backwards compatibility
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  return <ThemeToggle variant="button" className={className} />;
}