/**
 * Migration Helper Script
 * 
 * Provides utilities to help migrate from old auth implementations
 * to the new consolidated auth system.
 */

import { logger } from '@client/utils/logger';

/**
 * Import mapping from old to new locations
 */
export const IMPORT_MAPPINGS = {
  // Hooks
  "import { useAuth } from '@client/core/auth'": "import { useAuth } from '@/core/auth'",
  "from '@client/core/auth'": "from '@/core/auth'",
  
  // Redux
  "import { authSlice } from '@/store/slices/authSlice'": "import { authReducer } from '@/core/auth'",
  "import authSlice from '@/store/slices/authSlice'": "import { authReducer } from '@/core/auth'",
  "from '@/store/slices/authSlice'": "from '@/core/auth'",
  "authSlice.reducer": "authReducer",
  
  // Middleware
  "import { authMiddleware } from '@/store/middleware/authMiddleware'": "import { authMiddleware } from '@/core/auth'",
  "from '@/store/middleware/authMiddleware'": "from '@/core/auth'",
  
  // API Service
  "import { authService } from '@/services/auth-service-init'": "import { authApiService } from '@/core/auth'",
  "import { AuthApiService } from '@/core/api/auth'": "import { AuthApiService } from '@/core/auth'",
  "from '@/core/api/auth'": "from '@/core/auth'",
  "authService": "authApiService.instance",
  
  // Storage
  "import { tokenManager } from '@/utils/storage'": "import { tokenManager } from '@/core/auth'",
  "import { sessionManager } from '@/utils/storage'": "import { sessionManager } from '@/core/auth'",
  
  // Validation
  "import { validatePasswordComprehensive } from '@client/shared/ui/auth/utils/auth-validation'": "import { validatePasswordComprehensive } from '@/core/auth'",
  "from '@client/shared/ui/auth/utils/auth-validation'": "from '@/core/auth'"
};

/**
 * Code patterns that need updating
 */
export const CODE_PATTERNS = [
  {
    pattern: /authSlice\.reducer/g,
    replacement: 'authReducer',
    description: 'Replace authSlice.reducer with authReducer'
  },
  {
    pattern: /authService\./g,
    replacement: 'authApiService.instance.',
    description: 'Replace authService with authApiService.instance'
  },
  {
    pattern: /useAuth\(\)/g,
    replacement: 'useAuth()',
    description: 'useAuth hook usage (no change needed)'
  }
];

/**
 * Files that need to be removed after migration
 */
export const FILES_TO_REMOVE = [
  'client/src/store/slices/authSlice.ts',
  'client/src/store/middleware/authMiddleware.ts',
  'client/src/core/api/auth.ts',
  'client/src/services/auth-service-init.ts',
  'client/src/components/auth/utils/auth-validation.ts'
];

/**
 * Generate migration instructions for a specific file
 */
export function generateMigrationInstructions(_filePath: string, fileContent: string): {
  hasChanges: boolean;
  instructions: Array<{
    type: 'import' | 'code' | 'remove';
    description: string;
    oldCode: string;
    newCode: string;
    lineNumber?: number;
  }>;
} {
  const instructions: Array<{
    type: 'import' | 'code' | 'remove';
    description: string;
    oldCode: string;
    newCode: string;
    lineNumber?: number;
  }> = [];

  // Check for import mappings
  Object.entries(IMPORT_MAPPINGS).forEach(([oldImport, newImport]) => {
    if (fileContent.includes(oldImport)) {
      instructions.push({
        type: 'import',
        description: `Update import statement`,
        oldCode: oldImport,
        newCode: newImport
      });
    }
  });

  // Check for code patterns
  CODE_PATTERNS.forEach(({ pattern, replacement, description }) => {
    const matches = fileContent.match(pattern);
    if (matches) {
      matches.forEach(match => {
        instructions.push({
          type: 'code',
          description,
          oldCode: match,
          newCode: match.replace(pattern, replacement)
        });
      });
    }
  });

  return {
    hasChanges: instructions.length > 0,
    instructions
  };
}

/**
 * Generate app-wide migration plan
 */
export function generateMigrationPlan(): {
  phases: Array<{
    name: string;
    description: string;
    tasks: string[];
    estimatedTime: string;
  }>;
  totalEstimatedTime: string;
} {
  return {
    phases: [
      {
        name: 'Phase 1: Preparation',
        description: 'Prepare for migration and validate consolidated system',
        tasks: [
          'Backup current codebase',
          'Validate consolidated auth system is working',
          'Run tests to establish baseline',
          'Document current auth usage patterns'
        ],
        estimatedTime: '1-2 hours'
      },
      {
        name: 'Phase 2: Update Imports',
        description: 'Update all import statements to use consolidated auth system',
        tasks: [
          'Update React component imports',
          'Update Redux store configuration',
          'Update API client configuration',
          'Update utility imports'
        ],
        estimatedTime: '2-3 hours'
      },
      {
        name: 'Phase 3: Update Code Usage',
        description: 'Update code that uses auth services and utilities',
        tasks: [
          'Update authSlice.reducer to authReducer',
          'Update authService to authApiService.instance',
          'Update any custom auth logic',
          'Update test files'
        ],
        estimatedTime: '3-4 hours'
      },
      {
        name: 'Phase 4: Initialize New System',
        description: 'Add initialization for consolidated auth system',
        tasks: [
          'Add initializeAuth() call to app startup',
          'Configure auth settings for environment',
          'Update Redux store with new auth middleware',
          'Test authentication flows'
        ],
        estimatedTime: '2-3 hours'
      },
      {
        name: 'Phase 5: Cleanup',
        description: 'Remove old implementations and clean up',
        tasks: [
          'Remove old auth slice file',
          'Remove old auth middleware file',
          'Remove old auth API service file',
          'Remove old auth validation utilities',
          'Update documentation'
        ],
        estimatedTime: '1-2 hours'
      },
      {
        name: 'Phase 6: Testing & Validation',
        description: 'Comprehensive testing of migrated system',
        tasks: [
          'Run full test suite',
          'Test all authentication flows',
          'Test error handling',
          'Performance testing',
          'User acceptance testing'
        ],
        estimatedTime: '4-6 hours'
      }
    ],
    totalEstimatedTime: '13-20 hours'
  };
}

/**
 * Generate checklist for migration completion
 */
export function generateMigrationChecklist(): Array<{
  category: string;
  items: Array<{
    task: string;
    completed: boolean;
    critical: boolean;
  }>;
}> {
  return [
    {
      category: 'Import Updates',
      items: [
        { task: 'All useAuth imports updated to @/core/auth', completed: false, critical: true },
        { task: 'All authSlice imports updated to @/core/auth', completed: false, critical: true },
        { task: 'All authMiddleware imports updated to @/core/auth', completed: false, critical: true },
        { task: 'All authService imports updated to @/core/auth', completed: false, critical: true },
        { task: 'All tokenManager imports updated to @/core/auth', completed: false, critical: true },
        { task: 'All sessionManager imports updated to @/core/auth', completed: false, critical: true }
      ]
    },
    {
      category: 'Code Updates',
      items: [
        { task: 'authSlice.reducer replaced with authReducer', completed: false, critical: true },
        { task: 'authService calls replaced with authApiService.instance', completed: false, critical: true },
        { task: 'Redux store updated to use consolidated auth', completed: false, critical: true },
        { task: 'API client updated to use consolidated auth', completed: false, critical: true }
      ]
    },
    {
      category: 'Initialization',
      items: [
        { task: 'initializeAuth() added to app startup', completed: false, critical: true },
        { task: 'Auth configuration set up for environment', completed: false, critical: false },
        { task: 'AuthProvider wraps app components', completed: false, critical: true },
        { task: 'Redux store configured with new auth middleware', completed: false, critical: true }
      ]
    },
    {
      category: 'Cleanup',
      items: [
        { task: 'Old auth slice file removed', completed: false, critical: false },
        { task: 'Old auth middleware file removed', completed: false, critical: false },
        { task: 'Old auth API service file removed', completed: false, critical: false },
        { task: 'Old auth validation utilities removed', completed: false, critical: false },
        { task: 'Old auth service init file removed', completed: false, critical: false }
      ]
    },
    {
      category: 'Testing',
      items: [
        { task: 'Login flow tested', completed: false, critical: true },
        { task: 'Logout flow tested', completed: false, critical: true },
        { task: 'Token refresh tested', completed: false, critical: true },
        { task: 'Session management tested', completed: false, critical: true },
        { task: 'Error handling tested', completed: false, critical: true },
        { task: 'All existing tests pass', completed: false, critical: true }
      ]
    }
  ];
}

/**
 * Log migration status and next steps
 */
export function logMigrationStatus(): void {
  const plan = generateMigrationPlan();
  const checklist = generateMigrationChecklist();
  
  logger.info('Auth Migration Plan Generated', {
    component: 'AuthMigration',
    totalPhases: plan.phases.length,
    estimatedTime: plan.totalEstimatedTime
  });

  // Log each phase
  plan.phases.forEach((phase, index) => {
    logger.info(`Migration Phase ${index + 1}: ${phase.name}`, {
      component: 'AuthMigration',
      description: phase.description,
      tasks: phase.tasks,
      estimatedTime: phase.estimatedTime
    });
  });

  // Log checklist summary
  const totalItems = checklist.reduce((sum, category) => sum + category.items.length, 0);
  const criticalItems = checklist.reduce(
    (sum, category) => sum + category.items.filter(item => item.critical).length, 
    0
  );

  logger.info('Migration Checklist Summary', {
    component: 'AuthMigration',
    totalItems,
    criticalItems,
    categories: checklist.map(cat => cat.category)
  });
}

/**
 * Main migration helper function
 */
export async function runMigrationHelper(): Promise<void> {
  logger.info('Starting auth migration helper', {
    component: 'AuthMigration'
  });

  // Log migration status and plan
  logMigrationStatus();

  // Generate and log checklist
  const checklist = generateMigrationChecklist();
  logger.info('Migration checklist generated', {
    component: 'AuthMigration',
    checklist
  });

  logger.info('Migration helper completed. Review the logs for detailed migration plan.', {
    component: 'AuthMigration'
  });
}

export default {
  IMPORT_MAPPINGS,
  CODE_PATTERNS,
  FILES_TO_REMOVE,
  generateMigrationInstructions,
  generateMigrationPlan,
  generateMigrationChecklist,
  logMigrationStatus,
  runMigrationHelper
};