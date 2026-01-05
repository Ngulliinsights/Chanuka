/**
 * Command Palette Types
 *
 * Types for command palette functionality
 */

import type { LucideIcon } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string;
  action: () => void | Promise<void>;
  keywords: string[];
  section: string;
  priority?: number;
  disabled?: boolean;
}

export interface CommandSection {
  id: string;
  title: string;
  commands: Command[];
  priority: number;
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  filteredCommands: Command[];
  recentCommands: Command[];
  isLoading: boolean;
}

export interface CommandPaletteConfig {
  maxRecentCommands: number;
  enableKeyboardShortcuts: boolean;
  enableSearchHistory: boolean;
  placeholder: string;
  emptyStateMessage: string;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config?: Partial<CommandPaletteConfig>;
  customCommands?: Command[];
  onCommandExecute?: (command: Command) => void;
}
