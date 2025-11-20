/**
 * Dashboard State Reducer - Handles all dashboard state transitions
 */

import { DashboardState, DashboardAction } from '@client/types';

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_CONFIG':
      return {
        ...state,
        config: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_WIDGET_DATA':
      return {
        ...state,
        widgetData: {
          ...state.widgetData,
          [action.payload.widgetId]: action.payload.data,
        },
      };

    case 'SET_WIDGET_LOADING':
      return {
        ...state,
        widgetLoading: {
          ...state.widgetLoading,
          [action.payload.widgetId]: action.payload.loading,
        },
      };

    case 'SET_WIDGET_ERROR':
      return {
        ...state,
        widgetErrors: {
          ...state.widgetErrors,
          [action.payload.widgetId]: action.payload.error || new Error('Unknown error'),
        },
      };

    case 'UPDATE_WIDGET_CONFIG':
      if (!state.config) return state;

      const updatedWidgets = state.config.layout.widgets.map(widget =>
        widget.id === action.payload.widgetId
          ? { ...widget, ...action.payload.config }
          : widget
      );

      return {
        ...state,
        config: {
          ...state.config,
          layout: {
            ...state.config.layout,
            widgets: updatedWidgets,
          },
        },
      };

    case 'ADD_WIDGET':
      if (!state.config) return state;

      return {
        ...state,
        config: {
          ...state.config,
          layout: {
            ...state.config.layout,
            widgets: [...state.config.layout.widgets, action.payload],
          },
        },
      };

    case 'REMOVE_WIDGET':
      if (!state.config) return state;

      const filteredWidgets = state.config.layout.widgets.filter(
        widget => widget.id !== action.payload
      );

      // Also remove widget data, loading state, and errors
      const { [action.payload]: removedData, ...remainingData } = state.widgetData;
      const { [action.payload]: removedLoading, ...remainingLoading } = state.widgetLoading;
      const { [action.payload]: removedError, ...remainingErrors } = state.widgetErrors;

      return {
        ...state,
        config: {
          ...state.config,
          layout: {
            ...state.config.layout,
            widgets: filteredWidgets,
          },
        },
        widgetData: remainingData,
        widgetLoading: remainingLoading,
        widgetErrors: remainingErrors,
      };

    case 'UPDATE_LAYOUT':
      if (!state.config) return state;

      return {
        ...state,
        config: {
          ...state.config,
          layout: action.payload,
        },
      };

    case 'UPDATE_SETTINGS':
      if (!state.config) return state;

      return {
        ...state,
        config: {
          ...state.config,
          settings: {
            ...state.config.settings,
            ...action.payload,
          },
        },
      };

    default:
      return state;
  }
}

