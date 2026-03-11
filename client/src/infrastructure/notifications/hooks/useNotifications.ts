/**
 * useNotifications Hook
 * Integrates notifications service with React component lifecycle
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications';

export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsService.fetchPreferences(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useUnreadNotificationCount = (refetchInterval = 10000) => {
  return useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval,
    staleTime: 5000,
  });
};

export const useUpdateNotificationPreference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, channels, enabled }: { type: string; channels: string[]; enabled: boolean }) =>
      notificationsService.updatePreference(type, channels, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};
