/**
 * Notification Item Component
 * 
 * Individual notification display with actions and metadata
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageCircle, 
  User, 
  AlertTriangle, 
  Shield, 
  FileText, 
  Settings,
  ExternalLink,
  Trash2,
  Check
} from 'lucide-react';
import { Notification, NotificationType } from '@client/services/notification-service';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';

interface NotificationItemProps {
  notification: Notification;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function NotificationItem({
  notification,
  selected = false,
  onSelect,
  onClick,
  onDelete,
  showActions = true
}: NotificationItemProps) {
  const getNotificationIcon = (type: NotificationType) => {
    const iconMap = {
      comment_reply: MessageCircle,
      expert_response: User,
      mention: MessageCircle,
      moderation_action: Shield,
      expert_verification: User,
      campaign_update: FileText,
      petition_milestone: FileText,
      discussion_trending: MessageCircle,
      expert_insight: User,
      bill_update: FileText,
      system_alert: Settings,
      security_alert: AlertTriangle
    };

    const IconComponent = iconMap[type] || Settings;
    return <IconComponent className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-blue-500',
      low: 'bg-gray-500'
    };
    return colorMap[priority as keyof typeof colorMap] || colorMap.medium;
  };

  const getCategoryColor = (category: string) => {
    const colorMap = {
      community: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      bills: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      expert: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      moderation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      system: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      security: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colorMap[category as keyof typeof colorMap] || colorMap.system;
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click if clicking on actions
    if ((e.target as HTMLElement).closest('.notification-actions')) {
      return;
    }
    onClick?.();
  };

  const handleActionClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (action === 'delete') {
      onDelete?.();
    } else if (action === 'open' && notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  return (
    <div
      className={`
        p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors
        ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''}
        ${selected ? 'bg-blue-100 dark:bg-blue-800/30' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        {onSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Priority Indicator */}
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityColor(notification.priority)}`} />

        {/* Icon */}
        <div className="flex-shrink-0 mt-1 text-gray-500 dark:text-gray-400">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="notification-actions flex items-center gap-1 flex-shrink-0">
                {notification.actionUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                    onClick={(e) => handleActionClick('open', e)}
                    title="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick?.();
                    }}
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
                  onClick={(e) => handleActionClick('delete', e)}
                  title="Delete notification"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={`text-xs ${getCategoryColor(notification.category)}`}>
              {notification.category}
            </Badge>
            
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>

            {notification.priority === 'urgent' && (
              <Badge variant="destructive" className="text-xs">
                Urgent
              </Badge>
            )}

            {notification.isCommunityRelated && (
              <Badge variant="outline" className="text-xs">
                Community
              </Badge>
            )}
          </div>

          {/* Action Button */}
          {notification.actionText && notification.actionUrl && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => handleActionClick('open', e)}
              >
                {notification.actionText}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {/* Community Context */}
          {notification.communityContext && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {notification.communityContext.billId && (
                <span>Bill #{notification.communityContext.billId}</span>
              )}
              {notification.communityContext.expertId && (
                <span className="ml-2">Expert: {notification.communityContext.expertId}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}