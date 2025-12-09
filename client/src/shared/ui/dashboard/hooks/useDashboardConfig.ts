/**
 * Dashboard configuration management hook
 * Handles dashboard settings and preferences
 */

import type { DashboardConfig, DashboardSection } from '@client/types';
import { useState, useCallback, useEffect } from 'react';

import { DashboardConfigurationError } from '@client/errors';
import { validateDashboardConfig, safeValidateDashboardConfig } from '@client/validation';

const DEFAULT_CONFIG: DashboardConfig = {
  refreshInterval: 30000, // 30 seconds
  maxActionItems: 10,
  maxTrackedTopics: 20,
  enableAutoRefresh: true,
  showCompletedActions: false,
  defaultView: 'activity'
};

const CONFIG_STORAGE_KEY = 'dashboard-config';

export interface UseDashboardConfigResult {
  config: DashboardConfig;
  loading: boolean;
  error: DashboardConfigurationError | null;
  operations: {
    updateConfig: (updates: Partial<DashboardConfig>) => Promise<void>;
    resetConfig: () => Promise<void>;
    setRefreshInterval: (interval: number) => Promise<void>;
    setMaxItems: (maxActionItems: number, maxTrackedTopics: number) => Promise<void>;
    toggleAutoRefresh: () => Promise<void>;
    toggleCompletedActions: () => Promise<void>;
    setDefaultView: (view: DashboardSection) => Promise<void>;
    exportConfig: () => string;
    importConfig: (configJson: string) => Promise<void>;
  };
}

export function useDashboardConfig(initialConfig?: Partial<DashboardConfig>): UseDashboardConfigResult {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    // Try to load from localStorage first
    try {
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        const validation = safeValidateDashboardConfig({ ...DEFAULT_CONFIG, ...parsedConfig, ...initialConfig });
        return validation.success ? validation.data : DEFAULT_CONFIG;
      }
    } catch (error) {
      console.warn('Failed to load dashboard config from localStorage:', error);
    }

    // Fallback to default with initial overrides
    const validation = safeValidateDashboardConfig({ ...DEFAULT_CONFIG, ...initialConfig });
    return validation.success ? validation.data : DEFAULT_CONFIG;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DashboardConfigurationError | null>(null);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save dashboard config to localStorage:', error);
    }
  }, [config]);

  const updateConfig = useCallback(async (updates: Partial<DashboardConfig>) => {
    setLoading(true);
    setError(null);

    try {
      const newConfig = { ...config, ...updates };
      validateDashboardConfig(newConfig);

      // TODO: Replace with actual API call to save config
      await new Promise(resolve => setTimeout(resolve, 200));

      setConfig(newConfig);
    } catch (configError: any) {
      const error = new DashboardConfigurationError(
        `Failed to update configuration: ${configError?.message || 'Update failed'}`,
        { updates, originalConfig: config }
      );
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [config]);

  const resetConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call to reset config
      await new Promise(resolve => setTimeout(resolve, 200));

      setConfig(DEFAULT_CONFIG);
      
      // Clear localStorage
      try {
        localStorage.removeItem(CONFIG_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear dashboard config from localStorage:', error);
      }
    } catch (configError: any) {
      const error = new DashboardConfigurationError(
        `Failed to reset configuration: ${configError?.message || 'Reset failed'}`
      );
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const setRefreshInterval = useCallback(async (interval: number) => {
    await updateConfig({ refreshInterval: interval });
  }, [updateConfig]);

  const setMaxItems = useCallback(async (maxActionItems: number, maxTrackedTopics: number) => {
    await updateConfig({ maxActionItems, maxTrackedTopics });
  }, [updateConfig]);

  const toggleAutoRefresh = useCallback(async () => {
    await updateConfig({ enableAutoRefresh: !config.enableAutoRefresh });
  }, [config.enableAutoRefresh, updateConfig]);

  const toggleCompletedActions = useCallback(async () => {
    await updateConfig({ showCompletedActions: !config.showCompletedActions });
  }, [config.showCompletedActions, updateConfig]);

  const setDefaultView = useCallback(async (view: DashboardSection) => {
    await updateConfig({ defaultView: view });
  }, [updateConfig]);

  const exportConfig = useCallback((): string => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const importConfig = useCallback(async (configJson: string) => {
    setLoading(true);
    setError(null);

    try {
      const importedConfig = JSON.parse(configJson);
      validateDashboardConfig(importedConfig);

      // TODO: Replace with actual API call to save imported config
      await new Promise(resolve => setTimeout(resolve, 300));

      setConfig(importedConfig);
    } catch (configError: any) {
      const error = new DashboardConfigurationError(
        `Failed to import configuration: ${configError?.message || 'Import failed'}`,
        { configJson }
      );
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    error,
    operations: {
      updateConfig,
      resetConfig,
      setRefreshInterval,
      setMaxItems,
      toggleAutoRefresh,
      toggleCompletedActions,
      setDefaultView,
      exportConfig,
      importConfig
    }
  };
}

