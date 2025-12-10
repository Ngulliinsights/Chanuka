/**
 * Client Context Exports
 * Aggregates all context providers and hooks
 */

export { AuthProvider, useAuth } from '@client/core/auth';

// Re-export analytics hooks (useAnalytics is not exported, use the specific hooks instead)
export { useAnalyticsDashboard, useAnalyticsSummary, useBillAnalytics } from '@client/features/analytics/hooks';

// Placeholder hooks for future context providers
export function useLoading() {
  return { isLoading: false };
}

export function useNavigation() {
  return { navigate: () => {} };
}
