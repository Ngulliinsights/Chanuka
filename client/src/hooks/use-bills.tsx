import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsApi } from '../services/api';
import { useToast } from './use-toast';
import { logger } from '../utils/browser-logger';

/**
 * Type definitions for query parameters and mutation payloads.
 * These provide type safety throughout the application and serve as
 * living documentation of what data shapes the API expects.
 */
interface BillsQueryParams {
  search?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface CommentPayload {
  content: string;
  commentType?: string;
  userId: string;
}

interface EngagementPayload {
  userId: string;
  engagementType: string;
  metadata?: Record<string, any>;
}

/**
 * Fetches a filtered and paginated list of bills. This is your main bills
 * listing hook that powers search, filtering, and pagination functionality.
 * 
 * The staleTime is set to 5 minutes because bills data changes moderately
 * frequently as new bills are introduced and existing ones progress through
 * the legislative process. This strikes a balance between showing fresh data
 * and avoiding unnecessary refetches when users navigate around the app.
 */
export function useBills(params: BillsQueryParams = {}) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => billsApi.getAll(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches a single bill's complete details by ID. This hook powers your
 * bill detail pages and should be used whenever you need full information
 * about a specific bill rather than just list data.
 * 
 * The enabled flag prevents the query from running when id is undefined,
 * which commonly happens during route transitions or when using optional
 * routing parameters. This prevents error states during normal navigation.
 * 
 * Individual bills have a longer staleTime because once a bill is loaded,
 * its core content rarely changes within a single session. Status updates
 * happen, but they're infrequent enough that 10 minutes is reasonable.
 */
export function useBill(id: string | number | undefined) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billsApi.getById(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * Fetches all comments associated with a specific bill. Comments are
 * displayed in discussion sections and are expected to update as users
 * add new comments, so we keep a shorter staleTime to ensure the
 * conversation feels live and responsive.
 * 
 * This hook is frequently used alongside useBill, but we keep them
 * separate because comments might be loaded lazily (like in a tab that
 * users have to click) while the bill details load immediately.
 */
export function useBillComments(billId: string | number | undefined) {
  return useQuery({
    queryKey: ['bills', billId, 'comments'],
    queryFn: () => billsApi.getComments(billId!),
    enabled: !!billId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches the list of legislators who are sponsoring or co-sponsoring
 * a particular bill. Sponsor information is relatively stable once a
 * bill is introduced, though co-sponsors can be added over time.
 * 
 * The longer staleTime reflects that this data changes infrequently,
 * and when it does change, a slight delay in showing updates is
 * acceptable. This reduces server load for a common query.
 */
export function useBillSponsors(billId: string | number | undefined) {
  return useQuery({
    queryKey: ['bills', billId, 'sponsors'],
    queryFn: () => billsApi.getSponsors(billId!),
    enabled: !!billId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetches AI-generated analysis of a bill's content, impact, and
 * implications. This is expensive to generate on the backend, so
 * we cache it aggressively to reduce costs and improve performance.
 * 
 * Analysis is typically generated once and remains valid for the
 * life of the bill's text, so the 30-minute staleTime is actually
 * quite conservative. The long gcTime means even if users navigate
 * away, the analysis stays in memory for quick access if they return.
 */
export function useBillAnalysis(billId: string | number | undefined) {
  return useQuery({
    queryKey: ['bills', billId, 'analysis'],
    queryFn: () => billsApi.getAnalysis(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Fetches the list of available bill categories that users can filter by.
 * This is essentially reference data that powers dropdowns and filter
 * interfaces throughout your application.
 * 
 * Categories are defined by your legislative system and rarely change,
 * making them ideal for aggressive caching. The hour-long staleTime
 * means that in a typical user session, this data is fetched exactly
 * once and then reused everywhere it's needed.
 */
export function useBillCategories() {
  return useQuery({
    queryKey: ['bills', 'categories'],
    queryFn: () => billsApi.getCategories(),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

/**
 * Fetches the list of possible bill statuses that indicate where a bill
 * is in the legislative process. Like categories, this is reference data
 * that powers filtering and display logic throughout the application.
 * 
 * Statuses are even more static than categories since they represent
 * fundamental legislative stages that are unlikely to change. We cache
 * them for an hour and keep them in memory even longer because they're
 * tiny but used frequently.
 */
export function useBillStatuses() {
  return useQuery({
    queryKey: ['bills', 'statuses'],
    queryFn: () => billsApi.getStatuses(),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

/**
 * Mutation hook for adding a new comment to a bill. This handles the
 * entire lifecycle of posting a comment, including optimistic updates,
 * cache invalidation, and user feedback via toast notifications.
 * 
 * When a comment is successfully posted, we invalidate both the comments
 * query and the bill query itself. The bill query needs invalidation
 * because it likely includes a comment count that should update. This
 * ensures the UI stays consistent across all components.
 * 
 * Error handling shows the actual error message when available, falling
 * back to a generic message. This helps users understand what went wrong,
 * whether it's a network issue, validation failure, or something else.
 */
export function useAddBillComment(billId: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (comment: CommentPayload) => 
      billsApi.addComment(billId, comment),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['bills', billId, 'comments'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['bills', billId] 
      });
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Mutation hook for recording user engagement events with bills. This
 * tracks analytics data like views, shares, bookmarks, and other
 * interactions that help you understand how users engage with content.
 * 
 * Unlike comments, engagement tracking failures should not disrupt the
 * user experience. Users don't need to know if an analytics event fails
 * to record, so errors are logged to the console rather than shown as
 * toasts. The mutation still invalidates the bill query on success
 * because engagement metrics might be displayed on the bill itself.
 * 
 * The retry: false setting means if an engagement event fails, we don't
 * retry it automatically. This is appropriate for analytics where it's
 * better to lose a single event than to hammer the server with retries.
 */
export function useRecordBillEngagement(billId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (engagement: EngagementPayload) => 
      billsApi.recordEngagement(billId, engagement),
    
    retry: false,
    
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['bills', billId] 
      });
    },
    
    onError: (error: Error) => {
      logger.error('Failed to record engagement:', { component: 'Chanuka' }, error);
    },
  });
}

