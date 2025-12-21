/**
 * Cleanup Script for Old Authentication Implementations
 * 
 * This script helps identify and clean up old authentication implementations
 * after migrating to the consolidated auth system.
 */

import { logger } from '@client/utils/logger';

interface CleanupTask {
  name: string;
  description: string;
  filePath: string;
  action: 'deprecate' | 'remove' | 'update';
  status: 'pending' | 'completed' | 'skipped';
}

const CLEANUP_TASKS: CleanupTask[] = [
  {
    name: 'Legacy useAuth Hook',
    description: 'Replace with re-export from consolidated auth system',
    filePath: 'client/src/features/users/hooks/useAuth.tsx',
    action: 'deprecate',
    status: 'completed'
  },
  {
    name: 'Old Auth Slice',
    description: 'Remove old Redux auth slice',
    filePath: 'client/src/store/slices/authSlice.ts',
    action: 'remove',
    status: 'pending'
  },
  {
    name: 'Old Auth Middleware',
    description: 'Remove old Redux auth middleware',
    filePath: 'client/src/store/middleware/authMiddleware.ts',
    action: 'remove',
    status: 'pending'
  },
  {
    name: 'Old Auth API Service',
    description: 'Remove old auth API service',
    filePath: 'client/src/core/api/auth.ts',
    action: 'remove',
    status: 'pending'
  },
  {
    name: 'Old Auth Service Init',
    description: 'Remove old auth service initialization',
    filePath: 'client/src/services/auth-service-init.ts',
    action: 'remove',
    status: 'pending'
  },
  {
    name: 'Old Auth Validation',
    description: 'Remove old auth validation utilities',
    filePath: 'client/src/components/auth/utils/auth-validation.ts',
    action: 'remove',
    status: 'pending'
  },
  {
    name: 'Old Session Manager',
    description: 'Remove old session manager from storage',
    filePath: 'client/src/utils/storage.ts',
    action: 'update',
    status: 'pending'
  },
  {
    name: 'Store Index',
    description: 'Update store to use consolidated auth system',
    filePath: 'client/src/store/index.ts',
    action: 'update',
    status: 'completed'
  },
  {
    name: 'API Client',
    description: 'Update API client to use consolidated auth system',
    filePath: 'client/src/core/api/client.ts',
    action: 'update',
    status: 'completed'
  },
  {
    name: 'API Index',
    description: 'Update API index to use consolidated auth system',
    filePath: 'client/src/core/api/index.ts',
    action: 'update',
    status: 'completed'
  }
];

/**
 * Generate cleanup report
 */
export function generateCleanupReport(): {
  summary: {
    total: number;
    completed: number;
    pending: number;
    skipped: number;
  };
  tasks: CleanupTask[];
  nextSteps: string[];
} {
  const summary = CLEANUP_TASKS.reduce(
    (acc, task) => {
      acc.total++;
      acc[task.status]++;
      return acc;
    },
    { total: 0, completed: 0, pending: 0, skipped: 0 }
  );

  const nextSteps = [
    '1. Review and test the consolidated auth system',
    '2. Update any remaining components to use @/core/auth imports',
    '3. Remove old auth implementation files (marked for removal)',
    '4. Update tests to use the new consolidated APIs',
    '5. Update documentation to reflect the new auth system'
  ];

  return {
    summary,
    tasks: CLEANUP_TASKS,
    nextSteps
  };
}

/**
 * Log cleanup status
 */
export function logCleanupStatus(): void {
  const report = generateCleanupReport();
  
  logger.info('Auth System Cleanup Status', {
    component: 'AuthCleanup',
    summary: report.summary,
    completionRate: `${Math.round((report.summary.completed / report.summary.total) * 100)}%`
  });

  // Log pending tasks
  const pendingTasks = report.tasks.filter(task => task.status === 'pending');
  if (pendingTasks.length > 0) {
    logger.warn('Pending cleanup tasks', {
      component: 'AuthCleanup',
      pendingTasks: pendingTasks.map(task => ({
        name: task.name,
        action: task.action,
        filePath: task.filePath
      }))
    });
  }

  // Log next steps
  logger.info('Next cleanup steps', {
    component: 'AuthCleanup',
    nextSteps: report.nextSteps
  });
}

/**
 * Validate that consolidated auth system is working
 */
export async function validateConsolidatedAuth(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if consolidated auth module can be imported
    const authModule = await import('../index');
    
    if (!authModule.useAuth) {
      errors.push('useAuth hook not exported from consolidated auth system');
    }
    
    if (!authModule.AuthProvider) {
      errors.push('AuthProvider not exported from consolidated auth system');
    }
    
    if (!authModule.authReducer) {
      errors.push('authReducer not exported from consolidated auth system');
    }
    
    if (!authModule.authMiddleware) {
      errors.push('authMiddleware not exported from consolidated auth system');
    }
    
    if (!authModule.AuthApiService) {
      errors.push('AuthApiService not exported from consolidated auth system');
    }

    // Check if old files still exist (warnings)
    const oldFiles = [
      'client/src/store/slices/authSlice.ts',
      'client/src/store/middleware/authMiddleware.ts',
      'client/src/core/api/auth.ts',
      'client/src/services/auth-service-init.ts',
      'client/src/components/auth/utils/auth-validation.ts'
    ];

    for (const filePath of oldFiles) {
      try {
        // This would check if file exists in a real implementation
        warnings.push(`Old file may still exist: ${filePath}`);
      } catch {
        // File doesn't exist, which is good
      }
    }

  } catch (error) {
    errors.push(`Failed to import consolidated auth system: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main cleanup function
 */
export async function runAuthCleanup(): Promise<void> {
  logger.info('Starting auth system cleanup validation', {
    component: 'AuthCleanup'
  });

  // Log current status
  logCleanupStatus();

  // Validate consolidated system
  const validation = await validateConsolidatedAuth();
  
  if (validation.isValid) {
    logger.info('Consolidated auth system validation passed', {
      component: 'AuthCleanup',
      warnings: validation.warnings
    });
  } else {
    logger.error('Consolidated auth system validation failed', {
      component: 'AuthCleanup',
      errors: validation.errors,
      warnings: validation.warnings
    });
  }

  // Generate final report
  const report = generateCleanupReport();
  logger.info('Auth cleanup report generated', {
    component: 'AuthCleanup',
    report
  });
}

export default {
  generateCleanupReport,
  logCleanupStatus,
  validateConsolidatedAuth,
  runAuthCleanup,
  CLEANUP_TASKS
};