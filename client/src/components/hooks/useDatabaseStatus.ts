import { useQuery } from "@tanstack/react-query";

export function useDatabaseStatus() {
  // Updated database status endpoint to match refactored routes
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['database-status'],
    queryFn: async () => {
      const response = await fetch('/api/system/database/status');
      if (!response.ok) {
        throw new Error('Failed to fetch database status');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  return { data, isLoading, error, refetch };
}
