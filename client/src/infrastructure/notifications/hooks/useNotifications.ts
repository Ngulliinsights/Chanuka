/**
 * useNotifications Hook
 * Integrates notifications service with React component lifecycle
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications';

export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getNotifications(),
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: () => notificationsService.getUnreadCount(),
  });
};

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, channels, enabled }: { type: string; channels: string[]; enabled: boolean }) =>
      notificationsService.updatePreference(type, channels, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};
