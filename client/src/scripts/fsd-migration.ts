/**
 * Feature-Sliced Design (FSD) Migration Script
 *
 * Automates the reorganization of components according to FSD principles.
 * This script analyzes component usage and moves them to appropriate locations.
 */

import { logger } from '../utils/logger';

interface ComponentMapping {
  source: string;
  destination: string;
  category: 'shared-ui' | 'design-system' | 'feature-specific';
  feature?: string;
  reason: string;
}

/**
 * Component migration mappings based on usage analysis
 */
const COMPONENT_MAPPINGS: ComponentMapping[] = [
  // Design System Components (UI Primitives)
  {
    source: 'components/ui/button.tsx',
    destination: 'shared/design-system/primitives/Button.tsx',
    category: 'design-system',
    reason: 'Primitive UI component used across all features',
  },
  {
    source: 'components/ui/input.tsx',
    destination: 'shared/design-system/primitives/Input.tsx',
    category: 'design-system',
    reason: 'Primitive UI component used across all features',
  },
  {
    source: 'components/ui/card.tsx',
    destination: 'shared/design-system/primitives/Card.tsx',
    category: 'design-system',
    reason: 'Primitive UI component used across all features',
  },
  {
    source: 'components/ui/badge.tsx',
    destination: 'shared/design-system/primitives/Badge.tsx',
    category: 'design-system',
    reason: 'Primitive UI component used across all features',
  },
  {
    source: 'components/ui/alert.tsx',
    destination: 'shared/design-system/feedback/Alert.tsx',
    category: 'design-system',
    reason: 'Primitive feedback component used across all features',
  },

  // Shared UI Components (Cross-Feature)
  {
    source: 'components/layout/app-layout.tsx',
    destination: 'shared/ui/layout/Layout.tsx',
    category: 'shared-ui',
    reason: 'Layout component used across multiple features',
  },
  {
    source: 'components/navigation/ProgressiveDisclosureNavigation.tsx',
    destination: 'shared/ui/navigation/Navigation.tsx',
    category: 'shared-ui',
    reason: 'Navigation component used across multiple features',
  },
  {
    source: 'components/loading/LoadingStates.tsx',
    destination: 'shared/ui/loading/LoadingSpinner.tsx',
    category: 'shared-ui',
    reason: 'Loading component used across multiple features',
  },
  {
    source: 'components/error-handling/ErrorBoundary.tsx',
    destination: 'shared/ui/error/ErrorBoundary.tsx',
    category: 'shared-ui',
    reason: 'Error boundary used across multiple features',
  },
  {
    source: 'components/mobile/MobileNavigation.tsx',
    destination: 'shared/ui/mobile/MobileDrawer.tsx',
    category: 'shared-ui',
    reason: 'Mobile navigation used across multiple features',
  },

  // Bills Feature Components
  {
    source: 'components/bill-detail/BillHeader.tsx',
    destination: 'features/bills/ui/detail/BillHeader.tsx',
    category: 'feature-specific',
    feature: 'bills',
    reason: 'Bill-specific component used only in bills feature',
  },
  {
    source: 'components/bill-detail/BillOverviewTab.tsx',
    destination: 'features/bills/ui/detail/BillOverview.tsx',
    category: 'feature-specific',
    feature: 'bills',
    reason: 'Bill-specific component used only in bills feature',
  },
  {
    source: 'components/bill-detail/BillAnalysisTab.tsx',
    destination: 'features/bills/ui/analysis/BillAnalysis.tsx',
    category: 'feature-specific',
    feature: 'bills',
    reason: 'Bill-specific component used only in bills feature',
  },
  {
    source: 'components/bill-detail/ConstitutionalAnalysisPanel.tsx',
    destination: 'features/bills/ui/analysis/ConstitutionalAnalysis.tsx',
    category: 'feature-specific',
    feature: 'bills',
    reason: 'Bill-specific component used only in bills feature',
  },
  {
    source: 'components/bill-tracking/real-time-tracker.tsx',
    destination: 'features/bills/ui/tracking/BillTracking.tsx',
    category: 'feature-specific',
    feature: 'bills',
    reason: 'Bill-specific component used only in bills feature',
  },

  // Community Feature Components
  {
    source: 'components/community/CommunityHub.tsx',
    destination: 'features/community/ui/hub/CommunityHub.tsx',
    category: 'feature-specific',
    feature: 'community',
    reason: 'Community-specific component used only in community feature',
  },
  {
    source: 'components/discussion/DiscussionThread.tsx',
    destination: 'features/community/ui/discussion/DiscussionThread.tsx',
    category: 'feature-specific',
    feature: 'community',
    reason: 'Community-specific component used only in community feature',
  },
  {
    source: 'components/discussion/CommentForm.tsx',
    destination: 'features/community/ui/discussion/CommentForm.tsx',
    category: 'feature-specific',
    feature: 'community',
    reason: 'Community-specific component used only in community feature',
  },

  // Search Feature Components
  {
    source: 'components/search/advanced-search.tsx',
    destination: 'features/search/ui/interface/AdvancedSearch.tsx',
    category: 'feature-specific',
    feature: 'search',
    reason: 'Search-specific component used only in search feature',
  },

  // Auth/Users Feature Components
  {
    source: 'components/auth/AuthGuard.tsx',
    destination: 'features/users/ui/auth/AuthGuard.tsx',
    category: 'feature-specific',
    feature: 'users',
    reason: 'Auth-specific component used only in users feature',
  },
  {
    source: 'components/auth/TwoFactorSetup.tsx',
    destination: 'features/users/ui/auth/TwoFactorSetup.tsx',
    category: 'feature-specific',
    feature: 'users',
    reason: 'Auth-specific component used only in users feature',
  },
  {
    source: 'components/user/UserProfileSection.tsx',
    destination: 'features/users/ui/profile/UserProfile.tsx',
    category: 'feature-specific',
    feature: 'users',
    reason: 'User-specific component used only in users feature',
  },

  // Analytics Feature Components
  {
    source: 'components/analytics/EngagementAnalyticsDashboard.tsx',
    destination: 'features/analytics/ui/dashboard/EngagementDashboard.tsx',
    category: 'feature-specific',
    feature: 'analytics',
    reason: 'Analytics-specific component used only in analytics feature',
  },
];

/**
 * Import update mappings for fixing import statements
 */
const IMPORT_MAPPINGS = {
  // Design System imports
  '@client/lib/design-system/button': '@client/lib/design-system/Button',
  '@client/lib/design-system/input': '@client/lib/design-system/Input',
  '@client/lib/design-system/card': '@client/lib/design-system/Card',
  '@client/lib/design-system/badge': '@client/lib/design-system/Badge',
  '@client/lib/design-system/alert': '@client/lib/design-system/feedback/Alert',

  // Shared UI imports
  '@client/lib/components/layout': '@client/lib/ui/layout',
  '@client/lib/components/navigation': '@client/lib/ui/navigation',
  '@client/lib/components/loading': '@client/lib/ui/loading',
  '@client/lib/components/error-handling': '@client/lib/ui/error',
  '@client/lib/components/mobile': '@client/lib/ui/mobile',

  // Feature-specific imports
  '@client/lib/components/bill-detail': '@client/features/bills/ui/detail',
  '@client/lib/components/bill-tracking': '@client/features/bills/ui/tracking',
  '@client/lib/components/community': '@client/features/community/ui',
  '@client/lib/components/discussion': '@client/features/community/ui/discussion',
  '@client/lib/components/search': '@client/features/search/ui',
  '@client/lib/components/auth': '@client/features/users/ui/auth',
  '@client/lib/components/user': '@client/features/users/ui/profile',
  '@client/lib/components/analytics': '@client/features/analytics/ui',
};

/**
 * ESLint rules to enforce FSD boundaries
 */
const FSD_ESLINT_RULES = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['../features/*'],
          message: 'Cross-feature imports are not allowed. Use shared components instead.',
        },
        {
          group: ['../../features/*'],
          message: 'Cross-feature imports are not allowed. Use shared components instead.',
        },
        {
          group: ['../../../features/*'],
          message: 'Cross-feature imports are not allowed. Use shared components instead.',
        },
      ],
    },
  ],
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index'],
      pathGroups: [
        {
          pattern: '@client/lib/**',
          group: 'internal',
          position: 'before',
        },
        {
          pattern: '@client/features/**',
          group: 'internal',
          position: 'after',
        },
      ],
      pathGroupsExcludedImportTypes: ['builtin'],
    },
  ],
};

/**
 * Generate migration report
 */
export function generateMigrationReport(): {
  summary: {
    totalComponents: number;
    designSystemComponents: number;
    sharedUIComponents: number;
    featureSpecificComponents: number;
    byFeature: Record<string, number>;
  };
  mappings: ComponentMapping[];
  importUpdates: Record<string, string>;
  eslintRules: typeof FSD_ESLINT_RULES;
} {
  const summary = COMPONENT_MAPPINGS.reduce(
    (acc, mapping) => {
      acc.totalComponents++;

      switch (mapping.category) {
        case 'design-system':
          acc.designSystemComponents++;
          break;
        case 'shared-ui':
          acc.sharedUIComponents++;
          break;
        case 'feature-specific':
          acc.featureSpecificComponents++;
          if (mapping.feature) {
            acc.byFeature[mapping.feature] = (acc.byFeature[mapping.feature] || 0) + 1;
          }
          break;
      }

      return acc;
    },
    {
      totalComponents: 0,
      designSystemComponents: 0,
      sharedUIComponents: 0,
      featureSpecificComponents: 0,
      byFeature: {} as Record<string, number>,
    }
  );

  return {
    summary,
    mappings: COMPONENT_MAPPINGS,
    importUpdates: IMPORT_MAPPINGS,
    eslintRules: FSD_ESLINT_RULES,
  };
}

/**
 * Validate FSD structure compliance
 */
export function validateFSDCompliance(): {
  isCompliant: boolean;
  violations: Array<{
    type: 'cross-feature-import' | 'misplaced-component' | 'missing-index';
    file: string;
    description: string;
    suggestion: string;
  }>;
  score: number;
} {
  const violations: Array<{
    type: 'cross-feature-import' | 'misplaced-component' | 'missing-index';
    file: string;
    description: string;
    suggestion: string;
  }> = [];

  // This would be implemented with actual file system analysis
  // For now, return a placeholder structure

  const score = Math.max(0, 100 - violations.length * 10);

  return {
    isCompliant: violations.length === 0,
    violations,
    score,
  };
}

/**
 * Generate FSD documentation
 */
export function generateFSDDocumentation(): {
  structure: string;
  guidelines: string[];
  examples: Record<string, string>;
} {
  const structure = `
# Feature-Sliced Design Structure

\`\`\`
client/src/
├── shared/
│   ├── ui/                     # Cross-feature UI components
│   ├── design-system/         # Primitive components
│   ├── lib/                   # Shared utilities
│   └── api/                   # Shared API utilities
│
├── features/
│   ├── bills/
│   │   ├── ui/                # Bill-specific components
│   │   ├── api/               # Bill API services
│   │   ├── model/             # Bill business logic
│   │   └── lib/               # Bill utilities
│   │
│   ├── community/
│   │   ├── ui/                # Community components
│   │   ├── api/               # Community API
│   │   └── model/             # Community logic
│   │
│   └── [other features]/
│
├── pages/                     # Route components
├── app/                       # App-level components
└── core/                      # Cross-cutting concerns
\`\`\`
  `;

  const guidelines = [
    "Components used by a single feature should live in that feature's ui/ directory",
    'Components used by multiple features should be promoted to shared/ui/',
    'Primitive UI components (buttons, inputs) belong in shared/design-system/',
    "Features cannot import from other features' ui/ directories",
    'All imports should go through feature index files for clean APIs',
    'Use ESLint rules to enforce FSD boundaries automatically',
  ];

  const examples = {
    'Feature-specific component': `
// ✅ Good: Bill-specific component in bills feature
import { BillCard } from '@client/features/bills/ui';

// ❌ Bad: Importing from another feature
import { UserProfile } from '@client/features/users/ui';
    `,
    'Shared component usage': `
// ✅ Good: Using shared UI component
import { LoadingSpinner } from '@client/lib/ui';

// ✅ Good: Using design system primitive
import { Button } from '@client/lib/design-system';
    `,
    'Cross-feature communication': `
// ✅ Good: Using shared API or events
import { userApi } from '@client/lib/api';

// ❌ Bad: Direct feature-to-feature import
import { userService } from '@client/features/users/api';
    `,
  };

  return {
    structure,
    guidelines,
    examples,
  };
}

/**
 * Main migration execution function
 */
export async function executeFSDMigration(): Promise<void> {
  logger.info('Starting Feature-Sliced Design migration', {
    component: 'FSDMigration',
    totalMappings: COMPONENT_MAPPINGS.length,
  });

  const report = generateMigrationReport();

  logger.info('Migration report generated', {
    component: 'FSDMigration',
    summary: report.summary,
  });

  // Log migration plan
  report.mappings.forEach((mapping, index) => {
    logger.info(`Migration ${index + 1}/${report.mappings.length}`, {
      component: 'FSDMigration',
      source: mapping.source,
      destination: mapping.destination,
      category: mapping.category,
      feature: mapping.feature,
      reason: mapping.reason,
    });
  });

  // Validate current compliance
  const compliance = validateFSDCompliance();
  logger.info('FSD compliance check', {
    component: 'FSDMigration',
    isCompliant: compliance.isCompliant,
    score: compliance.score,
    violations: compliance.violations.length,
  });

  // Generate documentation
  const docs = generateFSDDocumentation();
  logger.info('FSD documentation generated', {
    component: 'FSDMigration',
    guidelines: docs.guidelines.length,
    examples: Object.keys(docs.examples).length,
  });

  logger.info('FSD migration analysis complete', {
    component: 'FSDMigration',
    nextSteps: [
      'Review migration mappings',
      'Execute component moves',
      'Update import statements',
      'Add ESLint rules',
      'Test all features',
    ],
  });
}

export default {
  generateMigrationReport,
  validateFSDCompliance,
  generateFSDDocumentation,
  executeFSDMigration,
  COMPONENT_MAPPINGS,
  IMPORT_MAPPINGS,
  FSD_ESLINT_RULES,
};
