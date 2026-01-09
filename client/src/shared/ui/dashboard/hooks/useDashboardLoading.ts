import { useState } from 'react';

export function useDashboardLoading(initial = true) {
  const [loading, setLoading] = useState<boolean>(initial);
  return { loading, setLoading } as const;
}
