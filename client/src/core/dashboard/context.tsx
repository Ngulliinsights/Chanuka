/**
 * Unified Dashboard Context - Consolidated from multiple dashboard implementations
 * Best practices: Widget-based architecture, data management, permissions
 */

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';

import { DashboardState, WidgetConfig, DashboardLayout, DashboardSettings } from '@client/types';
import { logger } from '@client/utils/logger';


const initialState: DashboardState = {
  id: '',
  name: '',
  widgets: [],
  layout: {
    type: 'grid',
    columns: 12,
    gap: 16,
    responsive: [],
    breakpoints: [],
  },
  userId: '',
  isPublic: false,
  tags: [],
  autoRefresh: false,
  refreshInterval: 300,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export interface DashboardContextValue {
  state: DashboardState;
  
  // Config management
  loadDashboard: (dashboardId: string) => Promise<void>;
  saveDashboard: (state: DashboardState) => Promise<void>;
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
  getWidget: (widgetId: string) => WidgetConfig | undefined;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function createDashboardProvider(
  dashboardService: {
    loadDashboard: (id: string) => Promise<DashboardState>;
    saveDashboard: (state: DashboardState) => Promise<void>;
    loadWidgetData: (widgetId: string, config: WidgetConfig) => Promise<unknown>;
  }
) {
  return function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<DashboardState>(initialState);

    // Auto-refresh widgets based on their refresh intervals
    useEffect(() => {
      const intervals: NodeJS.Timeout[] = [];

      state.widgets.forEach((widget: WidgetConfig) => {
        if (widget.refreshInterval && widget.refreshInterval > 0) {
          const interval = setInterval(() => {
            // Use a self-executing function to avoid closure issues
            const w = state.widgets.find(aw => aw.id === widget.id);
            if (w) {
              dashboardService.loadWidgetData(widget.id, w).catch((error) => {
                logger.error('Failed to refresh widget:', { widgetId: widget.id }, error);
              });
            }
          }, widget.refreshInterval * 1000);
          intervals.push(interval);
        }
      });

      return () => {
        intervals.forEach(interval => clearInterval(interval));
      };
    }, [state.widgets]);

    const loadDashboard = useCallback(async (dashboardId: string) => {
      try {
        const loadedState = await dashboardService.loadDashboard(dashboardId);
        setState(loadedState);
      } catch (error) {
        logger.error('Failed to load dashboard:', { dashboardId }, error);
      }
    }, []);

    const saveDashboard = useCallback(async (newState: DashboardState) => {
      try {
        await dashboardService.saveDashboard(newState);
        setState(newState);
      } catch (error) {
        logger.error('Failed to save dashboard:', { dashboardId: newState.id }, error);
      }
    }, []);

    const updateSettings = useCallback((_settings: Partial<DashboardSettings>) => {
      // Update dashboard settings
      setState(prev => ({
        ...prev,
        updatedAt: new Date(),
      }));
    }, []);

    const addWidget = useCallback((widget: WidgetConfig) => {
      setState(prev => ({
        ...prev,
        widgets: [...prev.widgets, widget],
        updatedAt: new Date(),
      }));
    }, []);

    const removeWidget = useCallback((widgetId: string) => {
      setState(prev => ({
        ...prev,
        widgets: prev.widgets.filter(w => w.id !== widgetId),
        updatedAt: new Date(),
      }));
    }, []);

    const updateWidget = useCallback((widgetId: string, config: Partial<WidgetConfig>) => {
      setState(prev => ({
        ...prev,
        widgets: prev.widgets.map(w =>
          w.id === widgetId ? { ...w, ...config } : w
        ),
        updatedAt: new Date(),
      }));
    }, []);

    const refreshWidget = useCallback(async (widgetId: string) => {
      const widget = state.widgets.find(w => w.id === widgetId);
      if (!widget) return;

      try {
        await dashboardService.loadWidgetData(widgetId, widget);
      } catch (error) {
        logger.error('Failed to refresh widget:', { widgetId }, error);
      }
    }, [state.widgets]);

    const refreshAllWidgets = useCallback(async () => {
      const refreshPromises = state.widgets.map(widget => 
        dashboardService.loadWidgetData(widget.id, widget)
      );

      await Promise.allSettled(refreshPromises);
    }, [state.widgets]);

    const updateLayout = useCallback((layout: DashboardLayout) => {
      setState(prev => ({
        ...prev,
        layout,
        updatedAt: new Date(),
      }));
    }, []);

    const getWidget = useCallback((widgetId: string) => {
      return state.widgets.find(w => w.id === widgetId);
    }, [state.widgets]);

    const value: DashboardContextValue = useMemo(() => ({
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
      getWidget,
    }), [
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
      getWidget,
    ]);

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

