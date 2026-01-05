/**
 * useCommandPalette Hook
 *
 * Hook for managing command palette state and keyboard shortcuts
 */

import { useState, useEffect, useCallback } from 'react';
import type { Command, CommandPaletteConfig } from './types';

interface UseCommandPaletteOptions {
  config?: Partial<CommandPaletteConfig>;
  customCommands?: Command[];
  onCommandExecute?: (command: Command) => void;
}

export const useCommandPalette = (options: UseCommandPaletteOptions = {}) => {
  const { config, customCommands, onCommandExecute } = options;
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for ⌘K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    // Only enable if keyboard shortcuts are enabled (default: true)
    if (config?.enableKeyboardShortcuts !== false) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [config?.enableKeyboardShortcuts]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
    config,
    customCommands,
    onCommandExecute
  };
};
