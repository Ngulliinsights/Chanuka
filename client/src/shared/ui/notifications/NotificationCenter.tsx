/**
 * Notification Center Component
 *
 * Main notification management interface with filtering, categorization,
 * and real-time updates.
 */

// Remove unused React import
import { Bell, Filter, Settings, Check, X, Trash } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';

import { useNotifications, useNotificationHistory } from '@/hooks/useNotifications';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/shared/design-system';
import { LoadingSpinner } from '@/shared/ui/loading';

import { NotificationItem } from './NotificationItem';
import NotificationPreferences from './NotificationPreferences';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  showPreferences?: boolean;
}

interface CategoryCounts {
  community: number;
  bills: number;
  expert: number;
  moderation: number;
  system: number;
  security: number;
  [key: string]: number;
}

interface CategoryOption {
  value: string;
  label: string;
  count?: number;
}

type BulkActionType = 'read' | 'delete' | 'archive';
type ViewType = 'recent' | 'history';

export function NotificationCenter({
  className = '',
  maxHeight = '400px',
  showPreferences = true,
}: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refresh,
    clearError,
  } = useNotifications();

  const { history, categories, loadHistory, bulkMarkAsRead, bulkDelete, archiveOld } =
    useNotificationHistory();

  const [isOpen, setIsOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [view, setView] = useState<ViewType>('recent');

  // Load history when switching to history view
  useEffect(() => {
    if (view === 'history') {
      loadHistory({
        limit: 50,
      });
    }
  }, [view, loadHistory]);

  const handleNotificationClick = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [markAsRead]
  );

  const handleBulkAction = useCallback(
    async (action: BulkActionType) => {
      if (selectedNotifications.length === 0) return;

      try {
        switch (action) {
          case 'read':
            await bulkMarkAsRead(selectedNotifications);
            break;
          case 'delete':
            await bulkDelete(selectedNotifications);
            break;
          case 'archive':
            // Archive is handled differently - it's time-based
            await archiveOld(30);
            break;
        }
        setSelectedNotifications([]);
      } catch (err) {
        console.error(`Failed to ${action} notifications:`, err);
      }
    },
    [selectedNotifications, bulkMarkAsRead, bulkDelete, archiveOld]
  );

  const handleSelectNotification = useCallback((notificationId: string, selected: boolean) => {
    setSelectedNotifications(prev =>
      selected ? [...prev, notificationId] : prev.filter(id => id !== notificationId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const currentNotifications = view === 'recent' ? notifications : history;
    const allIds = currentNotifications.map(n => n.id);
    setSelectedNotifications(selectedNotifications.length === allIds.length ? [] : allIds);
  }, [view, notifications, history, selectedNotifications.length]);

  const filteredNotifications = (view === 'recent' ? notifications : history).filter(
    notification => selectedCategory === 'all' || notification.category === selectedCategory
  );

  // Create extended categories with proper typing
  const extendedCategories: CategoryCounts = {
    community: (categories as Partial<CategoryCounts>).community ?? 0,
    bills: (categories as Partial<CategoryCounts>).bills ?? 0,
    expert: (categories as Partial<CategoryCounts>).expert ?? 0,
    moderation: (categories as Partial<CategoryCounts>).moderation ?? 0,
    system: (categories as Partial<CategoryCounts>).system ?? 0,
    security: (categories as Partial<CategoryCounts>).security ?? 0,
  };

  const totalCount = Object.values(extendedCategories).reduce((sum, count) => sum + count, 0);

  const categoryOptions: CategoryOption[] = [
    { value: 'all', label: 'All', count: totalCount },
    { value: 'community', label: 'Community', count: extendedCategories.community },
    { value: 'bills', label: 'Bills', count: extendedCategories.bills },
    { value: 'expert', label: 'Expert', count: extendedCategories.expert },
    { value: 'moderation', label: 'Moderation', count: extendedCategories.moderation },
    { value: 'system', label: 'System', count: extendedCategories.system },
    { value: 'security', label: 'Security', count: extendedCategories.security },
  ];

  const handleLoadMore = useCallback(() => {
    loadMore({});
  }, [loadMore]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Trigger */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden`}
          style={{ maxHeight }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* View Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                <Button
                  variant={view === 'recent' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs px-2 py-1"
                  onClick={() => setView('recent')}
                >
                  Recent
                </Button>
                <Button
                  variant={view === 'history' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs px-2 py-1"
                  onClick={() => setView('history')}
                >
                  History
                </Button>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => markAllAsRead()}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                    Archive old
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {showPreferences && (
                    <DropdownMenuItem onClick={() => setShowPreferencesModal(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Preferences
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={refresh}>Refresh</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={handleClose}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Filter by category:</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {categoryOptions.map(option => (
                <Button
                  key={option.value}
                  variant={selectedCategory === option.value ? 'secondary' : 'outline'}
                  size="sm"
                  className="text-xs px-2 py-1"
                  onClick={() => setSelectedCategory(option.value)}
                >
                  {option.label}
                  {option.count !== undefined && option.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {option.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedNotifications.length} selected
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => handleBulkAction('read')}
                  >
                    Mark read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => handleBulkAction('delete')}
                    aria-label="Delete selected"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={handleSelectAll}
                  >
                    {selectedNotifications.length === filteredNotifications.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  onClick={clearError}
                  aria-label="Dismiss error"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading && filteredNotifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-gray-500">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedCategory === 'all'
                    ? 'No notifications yet'
                    : `No ${selectedCategory} notifications`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    selected={selectedNotifications.includes(notification.id)}
                    onSelect={selected => handleSelectNotification(notification.id, selected)}
                    onClick={() => handleNotificationClick(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Load More */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && <NotificationPreferences />}

      {/* Click outside to close */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={handleClose} aria-hidden="true" />}
    </div>
  );
}
