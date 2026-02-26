/**
 * Consolidation mappings for infrastructure modules
 * 
 * This module defines the specific mappings for consolidating
 * 31 infrastructure modules down to ~20 modules.
 */

import type { ConsolidationMapping, ConsolidationPlan } from './types';
import {
  ConsolidationStrategy,
  ImpactLevel,
  MigrationType,
} from './types';

/**
 * Mapping for consolidating observability modules
 * Consolidates: monitoring, performance, telemetry, analytics → observability
 */
export const observabilityMapping: ConsolidationMapping = {
  sourceModules: ['monitoring', 'performance', 'telemetry', 'analytics'],
  targetModule: 'observability',
  strategy: ConsolidationStrategy.NEST,
  migrations: [
    {
      from: '@/infrastructure/monitoring',
      to: '@/infrastructure/observability/error-monitoring',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-observability.ts',
    },
    {
      from: '@/infrastructure/performance',
      to: '@/infrastructure/observability/performance',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-observability.ts',
    },
    {
      from: '@/infrastructure/telemetry',
      to: '@/infrastructure/observability/telemetry',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-observability.ts',
    },
    {
      from: '@/infrastructure/analytics',
      to: '@/infrastructure/observability/analytics',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-observability.ts',
    },
  ],
  breakingChanges: [
    {
      description:
        'Import paths changed from individual modules to unified observability module',
      impact: ImpactLevel.MEDIUM,
      mitigation:
        'Use automated migration script to update all import paths. All functionality remains accessible through new paths.',
      affectedFiles: [],
    },
    {
      description:
        'Observability interface now provides unified access to all monitoring capabilities',
      impact: ImpactLevel.LOW,
      mitigation:
        'Update code to use observability.trackError(), observability.trackPerformance(), etc. instead of separate module imports.',
      affectedFiles: [],
    },
  ],
};

/**
 * Mapping for consolidating state management modules
 * Consolidates: store, dashboard, navigation, loading → store (with slices)
 */
export const stateManagementMapping: ConsolidationMapping = {
  sourceModules: ['dashboard', 'navigation', 'loading'],
  targetModule: 'store',
  strategy: ConsolidationStrategy.REFACTOR,
  migrations: [
    {
      from: '@/infrastructure/dashboard',
      to: '@/infrastructure/store/slices/dashboard',
      type: MigrationType.MODULE_STRUCTURE,
      automated: true,
      script: 'scripts/migrate-state-management.ts',
    },
    {
      from: '@/infrastructure/navigation',
      to: '@/infrastructure/store/slices/navigation',
      type: MigrationType.MODULE_STRUCTURE,
      automated: true,
      script: 'scripts/migrate-state-management.ts',
    },
    {
      from: '@/infrastructure/loading',
      to: '@/infrastructure/store/slices/loading',
      type: MigrationType.MODULE_STRUCTURE,
      automated: true,
      script: 'scripts/migrate-state-management.ts',
    },
    {
      from: 'useDashboard(), useNavigation(), useLoading()',
      to: 'useAppSelector(), useAppDispatch() with slice selectors',
      type: MigrationType.API_SIGNATURE,
      automated: false,
    },
  ],
  breakingChanges: [
    {
      description:
        'State management consolidated into Redux store with slices',
      impact: ImpactLevel.HIGH,
      mitigation:
        'Replace custom hooks with Redux hooks. Use useAppSelector() with slice selectors instead of module-specific hooks.',
      affectedFiles: [],
    },
    {
      description:
        'State structure changed from separate modules to unified RootState',
      impact: ImpactLevel.MEDIUM,
      mitigation:
        'Update state access patterns to use store.getState().dashboard, store.getState().navigation, etc.',
      affectedFiles: [],
    },
  ],
};

/**
 * Mapping for consolidating API modules
 * Consolidates: api, http, realtime, websocket → api
 */
export const apiMapping: ConsolidationMapping = {
  sourceModules: ['http', 'realtime', 'websocket'],
  targetModule: 'api',
  strategy: ConsolidationStrategy.NEST,
  migrations: [
    {
      from: '@/infrastructure/http',
      to: '@/infrastructure/api/http',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-api.ts',
    },
    {
      from: '@/infrastructure/realtime',
      to: '@/infrastructure/api/realtime',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-api.ts',
    },
    {
      from: '@/infrastructure/websocket',
      to: '@/infrastructure/api/websocket',
      type: MigrationType.IMPORT_PATH,
      automated: true,
      script: 'scripts/migrate-api.ts',
    },
  ],
  breakingChanges: [
    {
      description:
        'API modules consolidated under unified api module',
      impact: ImpactLevel.MEDIUM,
      mitigation:
        'Use automated migration script to update import paths. All functionality remains accessible through new paths.',
      affectedFiles: [],
    },
    {
      description:
        'API client now provides unified interface for HTTP, WebSocket, and realtime',
      impact: ImpactLevel.LOW,
      mitigation:
        'Access clients through api.http, api.websocket, api.realtime instead of separate imports.',
      affectedFiles: [],
    },
  ],
};

/**
 * Complete consolidation plan
 */
export const consolidationPlan: ConsolidationPlan = {
  mappings: [
    observabilityMapping,
    stateManagementMapping,
    apiMapping,
  ],
  timelineWeeks: 10,
  moduleCountBefore: 31,
  moduleCountAfter: 20,
};

/**
 * Get all source modules being consolidated
 */
export function getAllSourceModules(): string[] {
  return consolidationPlan.mappings.flatMap((m) => m.sourceModules);
}

/**
 * Get all target modules after consolidation
 */
export function getAllTargetModules(): string[] {
  return consolidationPlan.mappings.map((m) => m.targetModule);
}

/**
 * Find mapping for a source module
 */
export function findMappingForSourceModule(
  sourceModule: string
): ConsolidationMapping | undefined {
  return consolidationPlan.mappings.find((m) =>
    m.sourceModules.includes(sourceModule)
  );
}

/**
 * Find mapping for a target module
 */
export function findMappingForTargetModule(
  targetModule: string
): ConsolidationMapping | undefined {
  return consolidationPlan.mappings.find(
    (m) => m.targetModule === targetModule
  );
}
