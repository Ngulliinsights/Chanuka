/**
 * Notification Center Component
 * 
 * Displays real-time notifications with priority handling, filtering,
 * and action capabilities integrated with WebSocket updates.
 */

import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useWebSocket';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Bell, 
  BellOff,
  X, 
  Check,
  AlertCircle,
  Info,
  TrendingUp,
  Users,
  FileText,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { RealTimeNotification } from '../../types/realtime';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  autoMarkRead?: boolean;
}

export function NotificationCenter({
  className,
  maxHeight = "400px",
  showHeader = true,
  autoMarkRead = false
}: NotificationCenterProps) {
  const {
    notifications,
    notificationCount,
    markAsRead,
    isConnected
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'critical'>('all');
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  // Auto-mark notifications as read after viewing for 3 seconds
  useEffect(() => {
    if (!autoMarkRead) return;

    const timers: NodeJS.Timeout[] = [];

    notifications.forEach(notification => {
      if (!notification.read) {
        const timer = setTimeout(() => {
          markAsRead(notification.id);
        }, 3000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, autoMarkRead, markAsRead]);

  const getNotificationIcon = (type: RealTimeNotification['type']) => {
    switch (type) {
      case 'bill_status':
        return <FileText className="h-4 w-4" />;
      case 'community_activity':
        return <Users className="h-4 w-4" />;
      case 'expert_response':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'trending_bill':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'constitutional_alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'engagement_milestone':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: RealTimeNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getPriorityBadgeVariant = (priority: RealTimeNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'destructive' as const;
      case 'high':
        return 'secondary' as const;
      case 'medium':
        return 'outline' as const;
      case 'low':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'high':
        return notification.priority === 'high' || notification.priority === 'critical';
      case 'critical':
        return notification.priority === 'critical';
      default:
        return true;
    }
  });

  const toggleExpanded = (notificationId: string) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedNotifications(newExpanded);
  };

  const handleNotificationAction = (notification: RealTimeNotification) => {
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {notificationCount}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isConnected && (
                <Badge variant="outline" className="text-xs">
                  <BellOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              
              {/* Filter buttons */}
              <div className="flex gap-1">
                {(['all', 'unread', 'high', 'critical'] as const).map((filterType) => (
                  <Button
                    key={filterType}
                    variant={filter === filterType ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(filterType)}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="pt-0">
        <ScrollArea style={{ maxHeight }}>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 rounded-md border transition-colors",
                      getPriorityColor(notification.priority),
                      !notification.read && "ring-2 ring-blue-200",
                      "hover:shadow-sm cursor-pointer"
                    )}
                    onClick={() => toggleExpanded(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium line-clamp-1">
                              {notification.title}
                            </p>
                            <p className={cn(
                              "text-xs text-muted-foreground mt-1",
                              isExpanded ? "line-clamp-none" : "line-clamp-2"
                            )}>
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant={getPriorityBadgeVariant(notification.priority)}
                              className="text-xs"
                            >
                              {notification.priority}
                            </Badge>
                            
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.created_at)}
                          </span>
                          
                          {notification.action_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationAction(notification);
                              }}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              {notification.action_text || 'View'}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Expiry warning */}
                        {notification.expires_at && (
                          <div className="mt-2 text-xs text-orange-600">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            Expires {formatTimestamp(notification.expires_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {/* Connection status footer */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isConnected ? 'Real-time updates active' : 'Using cached notifications'}
          </span>
          <span>
            {filteredNotifications.length} of {notifications.length} shown
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationCenter;