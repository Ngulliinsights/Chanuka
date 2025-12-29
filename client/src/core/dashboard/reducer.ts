/**
 * Dashboard State Reducer - Handles all dashboard state transitions
 *
 * Note: This reducer is currently unused in favor of useState-based state management
 * in the DashboardProvider. It's kept here for reference and potential future use.
 */

import { DashboardState, DashboardAction } from '@client/shared/types';

/**
 * Reducer for dashboard state transitions
 * Currently not in use but kept for reference and potential future expansion
 */
export function dashboardReducer(state: DashboardState, _action: DashboardAction): DashboardState {
  // This reducer is not currently used - state is managed via useState in context.tsx
  // The DashboardAction type only supports specific action types for external dashboard actions
  // For internal state transitions, use the context methods directly
  return state;
}

