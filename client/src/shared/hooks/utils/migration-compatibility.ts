/**
 * Migration Compatibility Layer
 * Provides backward compatibility during the hooks architecture migration
 */

import { useCallback, useEffect, useRef } from 'react';

// Legacy hook imports for backward compatibility
import { useToast } from '../use-toast';
import { useErrorRecovery } from '../useErrorRecovery';
import { useOfflineDetection } from '../use-offline-detection';
import { useSystem } from '../use-system';
import { useCleanup } from '../use-cleanup';
import { useMobile as useIsMobile } from '../use-mobile';
import { useDebounce } from '../useDebounce';
import { useMediaQuery } from '../useMediaQuery';
import { useKeyboardFocus } from '../use-keyboard-focus';
import { usePerformanceMonitor } from '../use-performance-monitor';
import { useArchitecturePerformance } from '../use-architecture-performance';
import { useSafeQuery } from '../use-safe-query';
import { useSafeEffect } from '../useSafeEffect';
import { useNotifications } from '../useNotifications';
import { useProgressiveDisclosure } from '../useProgressiveDisclosure';
import { useSeamlessIntegration } from '../useSeamlessIntegration';
import { useIntegratedServices } from '../useIntegratedServices';

// Legacy mobile hooks
import {
  useBottomSheet,
  useDeviceInfo,
  useInfiniteScroll,
  useMobileNavigation,
  useMobileTabs,
  usePullToRefresh,
  useScrollManager,
  useSwipeGesture,
} from '../mobile';

// Legacy FSD hooks (these would be implemented in their respective directories)
// For now, we'll create placeholder implementations that warn about migration

/**
 * Legacy Hook Compatibility Layer
 *
 * This layer provides backward compatibility for hooks that were previously
 * located in different directories or had different names.
 */

// Legacy shared hooks compatibility
export function useToastShared() {
  console.warn(
    'useToastShared is deprecated. Use useToast from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useToast();
}

export function useMobileShared() {
  console.warn(
    'useMobileShared is deprecated. Use useIsMobile from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useIsMobile();
}

export function useKeyboardFocusShared() {
  console.warn(
    'useKeyboardFocusShared is deprecated. Use useKeyboardFocus from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useKeyboardFocus();
}

export function useDebounceShared() {
  console.warn(
    'useDebounceShared is deprecated. Use useDebounce from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useDebounce();
}

export function useMediaQueryShared(query: string) {
  console.warn(
    'useMediaQueryShared is deprecated. Use useMediaQuery from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useMediaQuery(query);
}

export function useCleanupShared() {
  console.warn(
    'useCleanupShared is deprecated. Use useCleanup from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useCleanup();
}

export function useProgressiveDisclosureShared() {
  console.warn(
    'useProgressiveDisclosureShared is deprecated. Use useProgressiveDisclosure from @client/shared/hooks instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useProgressiveDisclosure();
}

// Legacy mobile hooks compatibility
export function useBottomSheetShared() {
  console.warn(
    'useBottomSheetShared is deprecated. Use useBottomSheet from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useBottomSheet();
}

export function useDeviceInfoShared() {
  console.warn(
    'useDeviceInfoShared is deprecated. Use useDeviceInfo from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useDeviceInfo();
}

export function useInfiniteScrollShared() {
  console.warn(
    'useInfiniteScrollShared is deprecated. Use useInfiniteScroll from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useInfiniteScroll();
}

export function useMobileNavigationShared() {
  console.warn(
    'useMobileNavigationShared is deprecated. Use useMobileNavigation from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useMobileNavigation();
}

export function useMobileTabsShared() {
  console.warn(
    'useMobileTabsShared is deprecated. Use useMobileTabs from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useMobileTabs();
}

export function usePullToRefreshShared() {
  console.warn(
    'usePullToRefreshShared is deprecated. Use usePullToRefresh from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return usePullToRefresh();
}

export function useScrollManagerShared() {
  console.warn(
    'useScrollManagerShared is deprecated. Use useScrollManager from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useScrollManager();
}

export function useSwipeGestureShared() {
  console.warn(
    'useSwipeGestureShared is deprecated. Use useSwipeGesture from @client/shared/hooks/mobile instead. ' +
    'This compatibility layer will be removed in a future version.'
  );
  return useSwipeGesture();
}

// Legacy FSD hooks compatibility (placeholders)
export function useAuth() {
  console.warn(
    'useAuth is not yet implemented in the standardized hooks. ' +
    'Please use the existing implementation from features/users/hooks. ' +
    'This compatibility layer will be updated when FSD migration is complete.'
  );
  // Return a minimal implementation to prevent runtime errors
  return {
    user: null,
    isAuthenticated: false,
    login: () => Promise.resolve(),
    logout: () => {},
    loading: false,
  };
}

export function useApiConnection() {
  console.warn(
    'useApiConnection is not yet implemented in the standardized hooks. ' +
    'Please use the existing implementation from core/api/hooks. ' +
    'This compatibility layer will be updated when FSD migration is complete.'
  );
  return {
    isConnected: true,
    connectionType: 'unknown',
    retryConnection: () => {},
  };
}

export function useUnifiedNavigation() {
  console.warn(
    'useUnifiedNavigation is not yet implemented in the standardized hooks. ' +
    'Please use the existing implementation from core/navigation/hooks. ' +
    'This compatibility layer will be updated when FSD migration is complete.'
  );
  return {
    currentRoute: '',
    navigate: () => {},
    goBack: () => {},
  };
}

export function useTimeoutAwareLoading() {
  console.warn(
    'useTimeoutAwareLoading is not yet implemented in the standardized hooks. ' +
    'Please use the existing implementation from core/loading/hooks. ' +
    'This compatibility layer will be updated when FSD migration is complete.'
  );
  return {
    loading: false,
    timeout: false,
    startLoading: () => {},
    stopLoading: () => {},
  };
}

// Migration utilities
export interface MigrationConfig {
  warnOnLegacyUsage?: boolean;
  logMigrationPath?: boolean;
  enableCompatibilityLayer?: boolean;
}

export function useMigrationConfig(config: MigrationConfig = {}) {
  const {
    warnOnLegacyUsage = true,
    logMigrationPath = true,
    enableCompatibilityLayer = true,
  } = config;

  const migrationWarningsRef = useRef<Set<string>>(new Set());

  const logMigration = useCallback((hookName: string, newImport: string) => {
    if (!enableCompatibilityLayer) return;

    const key = `${hookName}-${newImport}`;
    if (migrationWarningsRef.current.has(key)) return;

    migrationWarningsRef.current.add(key);

    if (logMigrationPath) {
      console.info(`Migration path for ${hookName}:`, {
        oldImport: `import { ${hookName} } from '.../legacy/path'`,
        newImport: `import { ${hookName} } from '${newImport}'`,
        deprecationDate: '2026-06-01',
        removalDate: '2026-12-01',
      });
    }

    if (warnOnLegacyUsage) {
      console.warn(
        `${hookName} is being used from the compatibility layer. ` +
        `Please migrate to the new import: ${newImport}`
      );
    }
  }, [warnOnLegacyUsage, logMigrationPath, enableCompatibilityLayer]);

  const checkMigrationStatus = useCallback((hookName: string) => {
    if (!enableCompatibilityLayer) {
      throw new Error(
        `${hookName} is not available. The compatibility layer has been disabled. ` +
        'Please migrate to the new standardized hooks.'
      );
    }
  }, [enableCompatibilityLayer]);

  return {
    logMigration,
    checkMigrationStatus,
    isCompatibilityLayerEnabled: enableCompatibilityLayer,
  };
}

// Migration status checker
export function useMigrationStatus() {
  const [migratedHooks, setMigratedHooks] = useState<string[]>([]);
  const [legacyHooks, setLegacyHooks] = useState<string[]>([]);

  useEffect(() => {
    // This would be populated by monitoring hook usage
    // For now, we'll provide a basic structure
    const checkHookUsage = () => {
      // Implementation would track which hooks are being used
      // and from which import paths
    };

    checkHookUsage();
  }, []);

  return {
    migratedHooks,
    legacyHooks,
    totalHooks: migratedHooks.length + legacyHooks.length,
    migrationProgress: migratedHooks.length / (migratedHooks.length + legacyHooks.length) * 100,
  };
}

// Deprecation warning hook
export function useDeprecationWarning(hookName: string, newImport: string, options: {
  version?: string;
  removalDate?: string;
  alternative?: string;
} = {}) {
  const { version = '1.0.0', removalDate, alternative } = options;
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!warnedRef.current) {
      console.warn(
        `[${hookName}] is deprecated as of version ${version}.`,
        removalDate && `It will be removed on ${removalDate}.`,
        alternative && `Use ${alternative} instead.`,
        `\nNew import: import { ${hookName} } from '${newImport}';`
      );
      warnedRef.current = true;
    }
  }, [hookName, newImport, version, removalDate, alternative]);

  return {
    isDeprecated: true,
    version,
    removalDate,
    alternative,
  };
}
