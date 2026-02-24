/**
 * Pretext Detection API Hooks
 * 
 * React hooks for interacting with the pretext detection API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pretextDetectionApi, type AnalyzeRequest, type ReviewAlertRequest, type GetAlertsParams } from '../api/pretext-detection-api';
import { logger } from '@client/lib/utils/logger';
import { notificationService } from '@client/features/notifications/model/notification-service';

/**
 * Hook to analyze a bill for pretext indicators
 */
export function useAnalyzeBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AnalyzeRequest) => pretextDetectionApi.analyze(request),
    onSuccess: (data) => {
      logger.info('Bill analysis completed', { billId: data.billId, score: data.score });
      
      // Show notification if high risk detected
      if (data.score > 70) {
        notificationService.addNotification({
          type: 'analysis',
          title: 'High Risk Bill Detected',
          message: `Bill ${data.billId} has a pretext risk score of ${data.score}/100`,
          priority: 'high',
          category: 'pretext_detection',
          actionUrl: `/pretext-detection`,
          metadata: { billId: data.billId, score: data.score },
        });
      }
      
      // Invalidate alerts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['pretext-alerts'] });
    },
    onError: (error) => {
      logger.error('Bill analysis failed', { component: 'usePretextDetectionApi' }, error);
      
      // Show error notification
      notificationService.addNotification({
        type: 'system',
        title: 'Analysis Failed',
        message: 'Failed to analyze bill for pretext indicators',
        priority: 'medium',
        category: 'pretext_detection',
      });
    },
  });
}

/**
 * Hook to get pretext alerts
 */
export function usePretextAlerts(params?: GetAlertsParams) {
  return useQuery({
    queryKey: ['pretext-alerts', params],
    queryFn: () => pretextDetectionApi.getAlerts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to review a pretext alert
 */
export function useReviewAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ReviewAlertRequest) => pretextDetectionApi.reviewAlert(request),
    onSuccess: (_, variables) => {
      logger.info('Alert reviewed successfully');
      
      // Show success notification
      notificationService.addNotification({
        type: 'system',
        title: 'Alert Reviewed',
        message: `Alert ${variables.status === 'approved' ? 'approved' : 'rejected'} successfully`,
        priority: 'low',
        category: 'pretext_detection',
      });
      
      // Invalidate alerts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['pretext-alerts'] });
    },
    onError: (error) => {
      logger.error('Alert review failed', { component: 'usePretextDetectionApi' }, error);
      
      // Show error notification
      notificationService.addNotification({
        type: 'system',
        title: 'Review Failed',
        message: 'Failed to review alert. Please try again.',
        priority: 'medium',
        category: 'pretext_detection',
      });
    },
  });
}

/**
 * Hook to get pretext detection analytics
 */
export function usePretextAnalytics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['pretext-analytics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => pretextDetectionApi.getAnalytics(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
