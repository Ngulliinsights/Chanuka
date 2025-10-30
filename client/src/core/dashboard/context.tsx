/**
 * Unified Dashboard Context - Consolidated from multiple dashboard implementations
 * Best practices: Widget-based architecture, data management, permissions
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { DashboardState, DashboardAction, DashboardConfig, WidgetConfig, DashboardLayout, DashboardSettings } from './types';
import { dashboardReducer } from './reducer';
import { logger } from '@shared/core';

const initialState: DashboardState = {
  config: null,
  loading: false,
  error: null,
  widgetData: {},
  widgetLoading: {},
  widgetErrors: {},
};

export interface DashboardContextValue {
  state: DashboardState;
  
  // Config management
  loadDashboard: (dashboardId: string) => Promise<void>;
  saveDashboard: (config: DashboardConfig) => Promise<void>;
  updateSettings: (settings: Partial<DashboardSettings>) => void;
  
  // Widget management
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, config: Partial<WidgetConfig>) => void;
  refreshWidget: (widgetId: string) => Promise<void>;
  refreshAllWidgets: () => Promise<void>;
  
  // Layout management
  updateLayout: (layout: DashboardLayout) => void;
  
  // Data management
  getWidgetData: (widgetId: string) => any;
  isWidgetLoading: (widgetId: string) => boolean;
  getWidgetError: (widgetId: string) => Error | null;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function createDashboardProvider(
  dashboardService: {
    loadDashboard: (id: string) => Promise<DashboardConfig>;
    saveDashboard: (config: DashboardConfig) => Promise<void>;
    loadWidgetData: (widgetId: string, config: WidgetConfig) => Promise<any>;
  }
) {
  return function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);

    // Auto-refresh widgets based on their refresh intervals
    useEffect(() => {
      if (!state.config) return;

      const intervals: NodeJS.Timeout[] = [];

      state.config.layout.widgets.forEach(widget => {
        if (widget.refreshInterval && widget.refreshInterval > 0) {
          const interval = setInterval(() => {
            refreshWidget(widget.id);
          }, widget.refreshInterval * 1000);
          intervals.push(interval);
        }
      });

      return () => {
        intervals.forEach(interval => clearInterval(interval));
      };
    }, [state.config]);

    const loadDashboard = useCallback(async (dashboardId: string) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        const config = await dashboardService.loadDashboard(dashboardId);
        dispatch({ type: 'SET_CONFIG', payload: config });

        // Load initial data for all widgets
        await refreshAllWidgets();
      } catch (error) {
        logger.error('Failed to load dashboard:', { dashboardId }, error);
        dispatch({ type: 'SET_ERROR', payload: error as Error });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []);

    const saveDashboard = useCallback(async (config: DashboardConfig) => {
      try {
        await dashboardService.saveDashboard(config);
        dispatch({ type: 'SET_CONFIG', payload: config });
      } catch (error) {
        logger.error('Failed to save dashboard:', { configId: config.id }, error);
        dispatch({ type: 'SET_ERROR', payload: error as Error });
      }
    }, []);

    const updateSettings = useCallback((settings: Partial<DashboardSettings>) => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    }, []);

    const addWidget = useCallback((widget: WidgetConfig) => {
      dispatch({ type: 'ADD_WIDGET', payload: widget });
      // Load initial data for the new widget
      refreshWidget(widget.id);
    }, []);

    const removeWidget = useCallback((widgetId: string) => {
      dispatch({ type: 'REMOVE_WIDGET', payload: widgetId });
    }, []);

    const updateWidget = useCallback((widgetId: string, config: Partial<WidgetConfig>) => {
      dispatch({ type: 'UPDATE_WIDGET_CONFIG', payload: { widgetId, config } });
    }, []);

    const refreshWidget = useCallback(async (widgetId: string) => {
      if (!state.config) return;

      const widget = state.config.layout.widgets.find(w => w.id === widgetId);
      if (!widget) return;

      try {
        dispatch({ type: 'SET_WIDGET_LOADING', payload: { widgetId, loading: true } });
        dispatch({ type: 'SET_WIDGET_ERROR', payload: { widgetId, error: null } });

        const data = await dashboardService.loadWidgetData(widgetId, widget);
        dispatch({ type: 'SET_WIDGET_DATA', payload: { widgetId, data } });
      } catch (error) {
        logger.error('Failed to refresh widget:', { widgetId }, error);
        dispatch({ type: 'SET_WIDGET_ERROR', payload: { widgetId, error: error as Error } });
      } finally {
        dispatch({ type: 'SET_WIDGET_LOADING', payload: { widgetId, loading: false } });
      }
    }, [state.config]);

    const refreshAllWidgets = useCallback(async () => {
      if (!state.config) return;

      const refreshPromises = state.config.layout.widgets.map(widget => 
        refreshWidget(widget.id)
      );

      await Promise.allSettled(refreshPromises);
    }, [state.config, refreshWidget]);

    const updateLayout = useCallback((layout: DashboardLayout) => {
      dispatch({ type: 'UPDATE_LAYOUT', payload: layout });
    }, []);

    const getWidgetData = useCallback((widgetId: string) => {
      return state.widgetData[widgetId];
    }, [state.widgetData]);

    const isWidgetLoading = useCallback((widgetId: string) => {
      return state.widgetLoading[widgetId] || false;
    }, [state.widgetLoading]);

    const getWidgetError = useCallback((widgetId: string) => {
      return state.widgetErrors[widgetId] || null;
    }, [state.widgetErrors]);

    const value: DashboardContextValue = {
      state,
      loadDashboard,
      saveDashboard,
      updateSettings,
      addWidget,
      removeWidget,
      updateWidget,
      refreshWidget,
      refreshAllWidgets,
      updateLayout,
      getWidgetData,
      isWidgetLoading,
      getWidgetError,
    };

    return (
      <DashboardContext.Provider value={value}>
        {children}
      </DashboardContext.Provider>
    );
  };
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

