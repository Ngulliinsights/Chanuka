/**
 * CommandPalette Component
 *
 * A command palette interface with ⌘K trigger for quick actions and navigation
 * Requirements: 5.3, 8.1, 8.2
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
} from '../../shared/design-system/interactive/Command';
import { Modal } from './Modal';
import { cn } from '../../shared/design-system/utils/cn';
import type {
  Command as CommandType,
  CommandSection,
  CommandPaletteProps,
  CommandPaletteConfig
} from './types';
import {
  createDefaultSections,
  filterCommands,
  groupCommandsBySection
} from './commands';

const DEFAULT_CONFIG: CommandPaletteConfig = {
  maxRecentCommands: 5,
  enableKeyboardShortcuts: true,
  enableSearchHistory: true,
  placeholder: 'Type a command or search...',
  emptyStateMessage: 'No commands found.'
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onOpenChange,
  config = {},
  customCommands = [],
  onCommandExecute
}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<CommandType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create default commands with navigation
  const defaultSections = useMemo(() => {
    const navigate = (path: string) => {
      // Use window.location for navigation since we don't have router context
      window.location.href = path;
    };

    const quickActions = {
      openSearch: () => {
        navigate('/search');
      },
      toggleTheme: () => {
        // Toggle theme implementation
        const html = document.documentElement;
        const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.classList.remove('dark', 'light');
        html.classList.add(newTheme);

        // Store preference
        localStorage.setItem('theme', newTheme);
      },
      openNotifications: () => {
        // Open notifications - could dispatch an event or navigate
        window.dispatchEvent(new CustomEvent('open-notifications'));
      },
      openSettings: () => {
        navigate('/settings');
      },
      openProfile: () => {
        navigate('/account');
      },
      logout: () => {
        // Logout implementation - could dispatch an event
        window.dispatchEvent(new CustomEvent('logout'));
      }
    };

    const helpActions = {
      openHelp: () => {
        navigate('/help');
      },
      openAbout: () => {
        navigate('/about');
      },
      openKeyboardShortcuts: () => {
        // Could open a modal or navigate to shortcuts page
        window.dispatchEvent(new CustomEvent('show-keyboard-shortcuts'));
      }
    };

    return createDefaultSections(navigate, quickActions, helpActions);
  }, []);

  // Combine all commands
  const allCommands = useMemo(() => {
    const defaultCommands = defaultSections.flatMap(section => section.commands);
    return [...defaultCommands, ...customCommands];
  }, [defaultSections, customCommands]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first when no query
      const recent = recentCommands.slice(0, finalConfig.maxRecentCommands);
      const remaining = allCommands.filter(cmd =>
        !recent.some(recent => recent.id === cmd.id)
      );
      return [...recent, ...remaining].slice(0, 20); // Limit to 20 items
    }

    return filterCommands(allCommands, query).slice(0, 10); // Limit search results
  }, [allCommands, query, recentCommands, finalConfig.maxRecentCommands]);

  // Group filtered commands by section
  const groupedCommands = useMemo(() => {
    return groupCommandsBySection(filteredCommands);
  }, [filteredCommands]);

  // Handle command execution
  const executeCommand = useCallback(async (command: CommandType) => {
    if (command.disabled) return;

    setIsLoading(true);

    try {
      // Execute the command
      await command.action();

      // Add to recent commands
      setRecentCommands(prev => {
        const filtered = prev.filter(cmd => cmd.id !== command.id);
        return [command, ...filtered].slice(0, finalConfig.maxRecentCommands);
      });

      // Call external handler
      onCommandExecute?.(command);

      // Close the palette
      onOpenChange(false);

    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onCommandExecute, onOpenChange, finalConfig.maxRecentCommands]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;

        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, executeCommand, onOpenChange]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Load recent commands from localStorage
  useEffect(() => {
    if (finalConfig.enableSearchHistory) {
      try {
        const stored = localStorage.getItem('command-palette-recent');
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentCommands(parsed.slice(0, finalConfig.maxRecentCommands));
        }
      } catch (error) {
        console.warn('Failed to load recent commands:', error);
      }
    }
  }, [finalConfig.enableSearchHistory, finalConfig.maxRecentCommands]);

  // Save recent commands to localStorage
  useEffect(() => {
    if (finalConfig.enableSearchHistory && recentCommands.length > 0) {
      try {
        localStorage.setItem('command-palette-recent', JSON.stringify(recentCommands));
      } catch (error) {
        console.warn('Failed to save recent commands:', error);
      }
    }
  }, [recentCommands, finalConfig.enableSearchHistory]);

  // Render command sections
  const renderSections = () => {
    const sections = defaultSections.filter(section =>
      groupedCommands[section.id]?.length > 0
    );

    // Add custom commands section if any
    if (customCommands.length > 0 && groupedCommands.other?.length > 0) {
      sections.push({
        id: 'other',
        title: 'Custom Commands',
        commands: groupedCommands.other,
        priority: 0
      });
    }

    // Sort sections by priority
    sections.sort((a, b) => b.priority - a.priority);

    return sections.map((section, sectionIndex) => {
      const commands = groupedCommands[section.id] || [];

      return (
        <React.Fragment key={section.id}>
          {sectionIndex > 0 && <CommandSeparator />}

          <CommandGroup heading={section.title}>
            {commands.map((command, commandIndex) => {
              const globalIndex = sections
                .slice(0, sectionIndex)
                .reduce((sum, s) => sum + (groupedCommands[s.id]?.length || 0), 0) + commandIndex;

              const isSelected = globalIndex === selectedIndex;
              const Icon = command.icon;

              return (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={() => executeCommand(command)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 cursor-pointer',
                    isSelected && 'bg-accent text-accent-foreground',
                    command.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={command.disabled}
                >
                  {Icon && (
                    <Icon
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {command.label}
                    </div>
                    {command.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {command.description}
                      </div>
                    )}
                  </div>

                  {command.shortcut && (
                    <CommandShortcut>
                      {command.shortcut}
                    </CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </React.Fragment>
      );
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      className="max-w-2xl"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder={finalConfig.placeholder}
          value={query}
          onValueChange={setQuery}
          className="border-0"
        />

        <CommandList className="max-h-[400px]">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Executing command...
            </div>
          ) : filteredCommands.length === 0 ? (
            <CommandEmpty>
              {finalConfig.emptyStateMessage}
            </CommandEmpty>
          ) : (
            renderSections()
          )}
        </CommandList>

        {/* Footer with keyboard hints */}
        <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/50">
          <div className="flex items-center justify-between">
            <span>
              ↑↓ Navigate • ↵ Select • Esc Close
            </span>
            {finalConfig.enableKeyboardShortcuts && (
              <span>
                ⌘K to open
              </span>
            )}
          </div>
        </div>
      </Command>
    </Modal>
  );
};

export default CommandPalette;
