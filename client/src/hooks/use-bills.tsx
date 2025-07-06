import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsApi } from '@/services/api';
import { useToast } from './use-toast';

export function useBills(params?: { category?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => billsApi.getAll(params),
  });
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billsApi.getById(id),
    enabled: !!id,
  });
}

export function useBillComments(billId: number) {
  return useQuery({
    queryKey: ['bills', billId, 'comments'],
    queryFn: () => billsApi.getComments(billId),
    enabled: !!billId,
  });
}

export function useBillCategories() {
  return useQuery({
    queryKey: ['bills', 'categories'],
    queryFn: () => billsApi.getCategories(),
  });
}

export function useBillStatuses() {
  return useQuery({
    queryKey: ['bills', 'statuses'],
    queryFn: () => billsApi.getStatuses(),
  });
}

export function useAddBillComment(billId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (comment: { content: string; commentType?: string; userId: string }) =>
      billsApi.addComment(billId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['bills', billId] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment.",
        variant: "destructive",
      });
    },
  });
}

export function useRecordBillEngagement(billId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (engagement: { userId: string; engagementType: string; metadata?: any }) =>
      billsApi.recordEngagement(billId, engagement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId] });
    },
  });
}