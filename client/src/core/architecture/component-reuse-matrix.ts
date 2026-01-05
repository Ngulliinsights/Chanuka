/**
 * Component Reuse Matrix
 *
 * Defines which existing components should be reused, refactored, or replaced
 * during the client architecture refinement process.
 */

export interface ComponentReuseEntry {
  path: string;
  status: 'reuse' | 'refactor' | 'replace' | 'deprecate';
  quality: 'high' | 'medium' | 'low';
  usage: string;
  integration: string;
  changes?: string[];
  becomes?: string;
  notes?: string;
}

export interface ComponentReuseMatrix {
  reuseAsIs: ComponentReuseEntry[];
  refactor: ComponentReuseEntry[];
  createNew: ComponentReuseEntry[];
}

/**
 * Component Reuse Matrix for Client Architecture Refinement
 * Based on the design document analysis
 */
export const COMPONENT_REUSE_MATRIX: ComponentReuseMatrix = {
  // REUSE AS-IS (High Quality, Well-Tested)
  reuseAsIs: [
    {
      path: 'client/src/features/search/ui/interface/IntelligentAutocomplete.tsx',
      status: 'reuse',
      quality: 'high',
      usage: 'Universal search input component',
      integration: 'Wrap in UnifiedSearchInterface for consistent API',
      notes: 'High-quality component with good test coverage'
    },
    {
      path: 'client/src/features/search/ui/results/SearchResultCard.tsx',
      status: 'reuse',
      quality: 'high',
      usage: 'Result display cards for all search contexts',
      integration: 'Use directly in search results pages',
      notes: 'Well-designed, accessible component'
    },
    {
      path: 'client/src/features/search/ui/filters/SearchFilters.tsx',
      status: 'reuse',
      quality: 'high',
      usage: 'Advanced filtering across search interfaces',
      integration: 'Integrate with UnifiedSearchInterface',
      notes: 'Comprehensive filtering with good UX'
    },
    {
      path: 'client/src/features/search/hooks/useIntelligentSearch.ts',
      status: 'reuse',
      quality: 'high',
      usage: 'Search state management and API integration',
      integration: 'Core hook for all search functionality',
      notes: 'Robust state management with error handling'
    },
    {
      path: 'client/src/shared/design-system/',
      status: 'reuse',
      quality: 'high',
      usage: 'All UI components (Button, Card, Input, etc.)',
      integration: 'Foundation for all new components',
      notes: 'Comprehensive design system with accessibility'
    },
    {
      path: 'client/src/shared/ui/loading/LoadingStates.tsx',
      status: 'reuse',
      quality: 'high',
      usage: 'Loading indicators across all pages',
      integration: 'Use for async operations and page transitions',
      notes: 'Consistent loading states with good UX'
    },
    {
      path: 'client/src/shared/ui/dashboard/',
      status: 'reuse',
      quality: 'high',
      usage: 'Dashboard widgets and layouts',
      integration: 'Foundation for persona-based dashboards',
      notes: 'Flexible widget system'
    },
    {
      path: 'client/src/core/auth/',
      status: 'reuse',
      quality: 'high',
      usage: 'Authentication system and user management',
      integration: 'Required for persona detection and protected routes',
      notes: 'Secure, well-tested authentication'
    },
    {
      path: 'client/src/core/navigation/',
      status: 'reuse',
      quality: 'high',
      usage: 'Navigation utilities and context',
      integration: 'Foundation for breadcrumb and navigation systems',
      notes: 'Solid navigation infrastructure'
    },
    {
      path: 'client/src/app/shell/ProtectedRoute.tsx',
      status: 'reuse',
      quality: 'high',
      usage: 'Route protection and authentication checks',
      integration: 'Use for admin and user-specific routes',
      notes: 'Secure route protection'
    },
    {
      path: 'client/src/app/shell/AppShell.tsx',
      status: 'reuse',
      quality: 'high',
      usage: 'App layout shell and structure',
      integration: 'Foundation for consistent page layouts',
      notes: 'Well-structured app shell'
    }
  ],

  // REFACTOR (Good Foundation, Needs Updates)
  refactor: [
    {
      path: 'client/src/pages/IntelligentSearchPage.tsx',
      status: 'refactor',
      quality: 'medium',
      usage: 'Main search interface',
      integration: 'Transform into UniversalSearchPage',
      becomes: 'UniversalSearchPage',
      changes: [
        'Remove duplicate search logic',
        'Integrate command palette functionality',
        'Simplify interface and improve UX',
        'Add persona-based search suggestions'
      ],
      notes: 'Good foundation but needs consolidation'
    },
    {
      path: 'client/src/pages/dashboard.tsx',
      status: 'refactor',
      quality: 'medium',
      usage: 'User dashboard',
      integration: 'Transform into AdaptiveDashboard',
      becomes: 'AdaptiveDashboard',
      changes: [
        'Add persona detection logic',
        'Implement progressive disclosure',
        'Add dashboard customization capabilities',
        'Optimize performance for 3-second load time'
      ],
      notes: 'Needs persona-based adaptation'
    },
    {
      path: 'client/src/pages/home.tsx',
      status: 'refactor',
      quality: 'medium',
      usage: 'Landing page',
      integration: 'Transform into StrategicHomePage',
      becomes: 'StrategicHomePage',
      changes: [
        'Implement progressive disclosure for auth status',
        'Add persona-specific welcome messages',
        'Optimize performance for 2-second load time',
        'Add prominent search functionality'
      ],
      notes: 'Needs strategic content adaptation'
    },
    {
      path: 'client/src/app/shell/AppRouter.tsx',
      status: 'refactor',
      quality: 'medium',
      usage: 'Application routing',
      integration: 'Update with consolidated routes',
      changes: [
        'Consolidate duplicate routes',
        'Add route redirects for backward compatibility',
        'Implement route preloading for critical paths',
        'Add breadcrumb generation'
      ],
      notes: 'Needs route consolidation'
    }
  ],

  // CREATE NEW (Missing Functionality)
  createNew: [
    {
      path: 'client/src/features/search/ui/UnifiedSearchInterface.tsx',
      status: 'replace',
      quality: 'high',
      usage: 'Wrapper combining all search components',
      integration: 'Primary search interface for header and pages',
      notes: 'New component wrapping existing search functionality'
    },
    {
      path: 'client/src/features/navigation/ui/CommandPalette.tsx',
      status: 'replace',
      quality: 'high',
      usage: '⌘K functionality with quick actions',
      integration: 'Global command palette accessible from any page',
      notes: 'New component for keyboard-driven navigation'
    },
    {
      path: 'client/src/features/navigation/ui/AdaptiveNavigation.tsx',
      status: 'replace',
      quality: 'high',
      usage: 'Context-aware navigation menu',
      integration: 'Replace static navigation with adaptive version',
      notes: 'Navigation that adapts to user persona and context'
    },
    {
      path: 'client/src/features/navigation/ui/BreadcrumbSystem.tsx',
      status: 'replace',
      quality: 'high',
      usage: 'Consistent breadcrumb navigation',
      integration: 'Add to all pages for navigation context',
      notes: 'Auto-generating breadcrumb system'
    },
    {
      path: 'client/src/features/personalization/utils/PersonaDetector.ts',
      status: 'replace',
      quality: 'high',
      usage: 'Auto-detect and assign user experience level',
      integration: 'Core utility for dashboard and content adaptation',
      notes: 'Algorithm to determine user persona based on activity'
    },
    {
      path: 'client/src/features/dashboard/ui/DashboardCustomizer.tsx',
      status: 'replace',
      quality: 'high',
      usage: 'User dashboard layout customization',
      integration: 'Allow users to customize dashboard widgets',
      notes: 'Drag-and-drop dashboard customization'
    },
    {
      path: 'client/src/features/personalization/ui/ProgressiveDisclosure.tsx',
      status: 'replace',
      quality: 'high',
      usage: 'Content adaptation based on user level',
      integration: 'Use across pages for persona-based content',
      notes: 'Component for showing/hiding content based on user level'
    },
    {
      path: 'client/src/core/performance/RoutePreloader.ts',
      status: 'replace',
      quality: 'high',
      usage: 'Intelligent route preloading system',
      integration: 'Preload critical routes for better performance',
      notes: 'Predictive preloading based on user behavior'
    },
    {
      path: 'client/src/core/performance/PerformanceMonitor.tsx',
      status: 'replace',
      quality: 'high',
      usage: 'Client-side performance tracking',
      integration: 'Monitor performance across all components',
      notes: 'Enhanced version of existing performance monitoring'
    },
    {
      path: 'client/src/core/accessibility/AccessibilityEnforcer.ts',
      status: 'replace',
      quality: 'high',
      usage: 'WCAG compliance utilities',
      integration: 'Ensure accessibility across all components',
      notes: 'Utilities for maintaining WCAG AA compliance'
    }
  ]
};

/**
 * Get components by status
 */
export const getComponentsByStatus = (status: ComponentReuseEntry['status']) => {
  const allComponents = [
    ...COMPONENT_REUSE_MATRIX.reuseAsIs,
    ...COMPONENT_REUSE_MATRIX.refactor,
    ...COMPONENT_REUSE_MATRIX.createNew
  ];

  return allComponents.filter(component => component.status === status);
};

/**
 * Get components by quality level
 */
export const getComponentsByQuality = (quality: ComponentReuseEntry['quality']) => {
  const allComponents = [
    ...COMPONENT_REUSE_MATRIX.reuseAsIs,
    ...COMPONENT_REUSE_MATRIX.refactor,
    ...COMPONENT_REUSE_MATRIX.createNew
  ];

  return allComponents.filter(component => component.quality === quality);
};

/**
 * Find component by path
 */
export const findComponentByPath = (path: string): ComponentReuseEntry | undefined => {
  const allComponents = [
    ...COMPONENT_REUSE_MATRIX.reuseAsIs,
    ...COMPONENT_REUSE_MATRIX.refactor,
    ...COMPONENT_REUSE_MATRIX.createNew
  ];

  return allComponents.find(component => component.path === path);
};

/**
 * Get refactoring plan summary
 */
export const getRefactoringPlanSummary = () => {
  return {
    reuseCount: COMPONENT_REUSE_MATRIX.reuseAsIs.length,
    refactorCount: COMPONENT_REUSE_MATRIX.refactor.length,
    createNewCount: COMPONENT_REUSE_MATRIX.createNew.length,
    totalComponents: COMPONENT_REUSE_MATRIX.reuseAsIs.length +
                    COMPONENT_REUSE_MATRIX.refactor.length +
                    COMPONENT_REUSE_MATRIX.createNew.length,
    highQualityCount: getComponentsByQuality('high').length,
    mediumQualityCount: getComponentsByQuality('medium').length,
    lowQualityCount: getComponentsByQuality('low').length
  };
};
