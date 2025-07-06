import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BillsQuery {
  search?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useBills(params: BillsQuery = {}) {
  return useQuery({
    queryKey: ['/api/bills', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (params.search) searchParams.append('search', params.search);
      if (params.category) searchParams.append('category', params.category);
      if (params.status) searchParams.append('status', params.status);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());
      
      const queryString = searchParams.toString();
      const url = `/api/bills${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }
      return response.json();
    },
  });
}

export function useBill(id: string | number) {
  return useQuery({
    queryKey: ['/api/bills', id],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bill');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export function useBillCategories() {
  return useQuery({
    queryKey: ['/api/bills/categories'],
    queryFn: async () => {
      const response = await fetch('/api/bills/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });
}

export function useBillStatuses() {
  return useQuery({
    queryKey: ['/api/bills/statuses'],
    queryFn: async () => {
      const response = await fetch('/api/bills/statuses');
      if (!response.ok) {
        throw new Error('Failed to fetch statuses');
      }
      return response.json();
    },
  });
}

export function useBillSponsors(billId: string | number) {
  return useQuery({
    queryKey: ['/api/bills', billId, 'sponsors'],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/sponsors`);
      if (!response.ok) {
        throw new Error('Failed to fetch bill sponsors');
      }
      return response.json();
    },
    enabled: !!billId,
  });
}

export function useBillAnalysis(billId: string | number) {
  return useQuery({
    queryKey: ['/api/bills', billId, 'analysis'],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to fetch bill analysis');
      }
      return response.json();
    },
    enabled: !!billId,
  });
}