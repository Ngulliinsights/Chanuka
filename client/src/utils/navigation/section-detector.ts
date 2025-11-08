import { NavigationSection } from '../../types/navigation';

/**
 * Determines the current navigation section based on the path
 */
export function determineNavigationSection(path: string | undefined | null): NavigationSection {
  // Fallback to root if path is missing or invalid
  const safePath: string = typeof path === 'string' ? path : '/';

  // Safely remove query parameters and hash fragments
  const cleanPath: string = safePath.split('?')[0]?.split('#')[0] ?? '/';

  // Legislative section
  if (
    cleanPath === '/' ||
    cleanPath.startsWith('/bills') ||
    cleanPath.startsWith('/bill-sponsorship-analysis')
  ) {
    return 'legislative';
  }

  // Community section
  if (
    cleanPath.startsWith('/community') ||
    cleanPath.startsWith('/expert-verification') ||
    cleanPath.endsWith('/comments') ||
    cleanPath.includes('/comments/')
  ) {
    return 'community';
  }

  // User section
  if (
    cleanPath.startsWith('/dashboard') ||
    cleanPath.startsWith('/profile') ||
    cleanPath.startsWith('/user-profile') ||
    cleanPath.startsWith('/onboarding') ||
    cleanPath.startsWith('/auth')
  ) {
    return 'user';
  }

  // Admin section
  if (cleanPath.startsWith('/admin')) {
    return 'admin';
  }

  // Tools section
  if (cleanPath.startsWith('/search')) {
    return 'tools';
  }

  // Default fallback
  return 'tools';
}

/**
 * Gets the section display name
 */
export function getSectionDisplayName(section: NavigationSection): string {
  const sectionNames: Record<NavigationSection, string> = {
    legislative: 'Legislative Data',
    community: 'Community',
    tools: 'Tools',
    user: 'User Account',
    admin: 'Administration',
    system: 'System',
  };

  return sectionNames[section];
}

/**
 * Gets the section description
 */
export function getSectionDescription(section: NavigationSection): string {
  const sectionDescriptions: Record<NavigationSection, string> = {
    legislative: 'Browse bills, analysis, and sponsorship information',
    community: 'Community input, discussions, and expert verification',
    tools: 'Search, discovery, and utility tools',
    user: 'Personal dashboard, profile, and account settings',
    admin: 'Administrative tools and system management',
    system: 'System utilities and configuration',
  };

  return sectionDescriptions[section];
}

/**
 * Checks if a section requires authentication
 */
export function sectionRequiresAuth(section: NavigationSection): boolean {
  return section === 'user' || section === 'admin';
}

/**
 * Checks if a section requires admin privileges
 */
export function sectionRequiresAdmin(section: NavigationSection): boolean {
  return section === 'admin';
}
