/**
 * Hook for managing mobile tabs state
 */

export function useMobileTabs(_tabs: unknown[]) {
  return {
    activeTab: '',
    setActiveTab: () => {},
  };
}