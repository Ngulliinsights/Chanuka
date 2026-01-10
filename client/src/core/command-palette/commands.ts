/**
 * Default Command Palette Commands
 *
 * Predefined commands for navigation, search, and quick actions
 */

import {
  Home,
  Search,
  FileText,
  Users,
  Settings,
  User,
  BarChart3,
  Bell,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

import type { Command, CommandSection } from './types';

/**
 * Navigation Commands
 */
export const createNavigationCommands = (navigate: (path: string) => void): Command[] => [
  {
    id: 'nav-home',
    label: 'Go to Home',
    description: 'Navigate to the home page',
    icon: Home,
    shortcut: '⌘H',
    action: () => navigate('/'),
    keywords: ['home', 'dashboard', 'main'],
    section: 'navigation',
    priority: 10,
  },
  {
    id: 'nav-bills',
    label: 'Go to Bills',
    description: 'Browse and search bills',
    icon: FileText,
    shortcut: '⌘B',
    action: () => navigate('/bills'),
    keywords: ['bills', 'legislation', 'laws'],
    section: 'navigation',
    priority: 9,
  },
  {
    id: 'nav-search',
    label: 'Go to Search',
    description: 'Advanced search interface',
    icon: Search,
    shortcut: '⌘S',
    action: () => navigate('/search'),
    keywords: ['search', 'find', 'lookup'],
    section: 'navigation',
    priority: 8,
  },
  {
    id: 'nav-community',
    label: 'Go to Community',
    description: 'Community discussions and insights',
    icon: Users,
    action: () => navigate('/community'),
    keywords: ['community', 'discussions', 'forum'],
    section: 'navigation',
    priority: 7,
  },
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    description: 'Personal dashboard and analytics',
    icon: BarChart3,
    shortcut: '⌘D',
    action: () => navigate('/dashboard'),
    keywords: ['dashboard', 'analytics', 'personal'],
    section: 'navigation',
    priority: 6,
  },
];

/**
 * Quick Action Commands
 */
export const createQuickActionCommands = (actions: {
  openSearch?: () => void;
  toggleTheme?: () => void;
  openNotifications?: () => void;
  openSettings?: () => void;
  openProfile?: () => void;
  logout?: () => void;
}): Command[] => {
  const commands: Command[] = [];

  if (actions.openSearch) {
    commands.push({
      id: 'action-search',
      label: 'Search Bills',
      description: 'Open search interface',
      icon: Search,
      shortcut: '⌘/',
      action: actions.openSearch,
      keywords: ['search', 'find', 'bills'],
      section: 'actions',
      priority: 10,
    });
  }

  if (actions.toggleTheme) {
    commands.push({
      id: 'action-theme',
      label: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: Settings,
      shortcut: '⌘T',
      action: actions.toggleTheme,
      keywords: ['theme', 'dark', 'light', 'mode'],
      section: 'actions',
      priority: 5,
    });
  }

  if (actions.openNotifications) {
    commands.push({
      id: 'action-notifications',
      label: 'Open Notifications',
      description: 'View recent notifications',
      icon: Bell,
      shortcut: '⌘N',
      action: actions.openNotifications,
      keywords: ['notifications', 'alerts', 'updates'],
      section: 'actions',
      priority: 7,
    });
  }

  if (actions.openSettings) {
    commands.push({
      id: 'action-settings',
      label: 'Open Settings',
      description: 'Manage account and preferences',
      icon: Settings,
      shortcut: '⌘,',
      action: actions.openSettings,
      keywords: ['settings', 'preferences', 'config'],
      section: 'actions',
      priority: 6,
    });
  }

  if (actions.openProfile) {
    commands.push({
      id: 'action-profile',
      label: 'View Profile',
      description: 'View and edit your profile',
      icon: User,
      action: actions.openProfile,
      keywords: ['profile', 'account', 'user'],
      section: 'actions',
      priority: 4,
    });
  }

  if (actions.logout) {
    commands.push({
      id: 'action-logout',
      label: 'Sign Out',
      description: 'Sign out of your account',
      icon: undefined,
      action: actions.logout,
      keywords: ['logout', 'signout', 'exit'],
      section: 'actions',
      priority: 1,
    });
  }

  return commands;
};

/**
 * Help Commands
 */
export const createHelpCommands = (actions: {
  openHelp?: () => void;
  openAbout?: () => void;
  openKeyboardShortcuts?: () => void;
}): Command[] => {
  const commands: Command[] = [];

  if (actions.openHelp) {
    commands.push({
      id: 'help-docs',
      label: 'Help & Documentation',
      description: 'View help documentation',
      icon: HelpCircle,
      shortcut: '⌘?',
      action: actions.openHelp,
      keywords: ['help', 'docs', 'documentation', 'support'],
      section: 'help',
      priority: 10,
    });
  }

  if (actions.openKeyboardShortcuts) {
    commands.push({
      id: 'help-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: BookOpen,
      action: actions.openKeyboardShortcuts,
      keywords: ['shortcuts', 'keyboard', 'hotkeys'],
      section: 'help',
      priority: 8,
    });
  }

  if (actions.openAbout) {
    commands.push({
      id: 'help-about',
      label: 'About Chanuka',
      description: 'Learn about the platform',
      icon: HelpCircle,
      action: actions.openAbout,
      keywords: ['about', 'info', 'platform'],
      section: 'help',
      priority: 5,
    });
  }

  return commands;
};

/**
 * Create default command sections
 */
export const createDefaultSections = (
  navigate: (path: string) => void,
  quickActions: Parameters<typeof createQuickActionCommands>[0] = {},
  helpActions: Parameters<typeof createHelpCommands>[0] = {}
): CommandSection[] => {
  const sections: CommandSection[] = [];

  // Quick Actions Section
  const quickActionCommands = createQuickActionCommands(quickActions);
  if (quickActionCommands.length > 0) {
    sections.push({
      id: 'actions',
      title: 'Quick Actions',
      commands: quickActionCommands,
      priority: 10,
    });
  }

  // Navigation Section
  sections.push({
    id: 'navigation',
    title: 'Go to Page',
    commands: createNavigationCommands(navigate),
    priority: 8,
  });

  // Help Section
  const helpCommands = createHelpCommands(helpActions);
  if (helpCommands.length > 0) {
    sections.push({
      id: 'help',
      title: 'Help & Support',
      commands: helpCommands,
      priority: 5,
    });
  }

  return sections;
};

/**
 * Filter commands based on search query
 */
export const filterCommands = (commands: Command[], query: string): Command[] => {
  if (!query.trim()) {
    return commands.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  const normalizedQuery = query.toLowerCase().trim();

  return commands
    .filter(command => {
      if (command.disabled) return false;

      // Search in label, description, and keywords
      const searchText = [command.label, command.description || '', ...command.keywords]
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    })
    .sort((a, b) => {
      // Prioritize exact matches in label
      const aLabelMatch = a.label.toLowerCase().includes(normalizedQuery);
      const bLabelMatch = b.label.toLowerCase().includes(normalizedQuery);

      if (aLabelMatch && !bLabelMatch) return -1;
      if (!aLabelMatch && bLabelMatch) return 1;

      // Then sort by priority
      return (b.priority || 0) - (a.priority || 0);
    });
};

/**
 * Group commands by section
 */
export const groupCommandsBySection = (commands: Command[]): Record<string, Command[]> => {
  return commands.reduce(
    (groups, command) => {
      const section = command.section || 'other';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(command);
      return groups;
    },
    {} as Record<string, Command[]>
  );
};
