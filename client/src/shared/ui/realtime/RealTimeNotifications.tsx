import { useState, useEffect } from 'react';
// import { useWebSocket } from '@client/hooks/useWebSocket';
import { Bell, AlertCircle, Info, X } from 'lucide-react';

import { cn } from '@client/lib/utils';
// import { logger } from '@client/utils/logger';

interface Notification {
  id: string;
  type: 'bill_status_change' | 'new_comment' | 'system_alert' | 'test';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  read?: boolean;
}

interface RealTimeNotificationsProps {
  className?: string;
  maxNotifications?: number;
  autoHideDelay?: number;
}

export function RealTimeNotifications({ 
  className, 
  // maxNotifications = 5, // Unused parameter
  // autoHideDelay = 5000 // Unused parameter
}: RealTimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  
  // Mock WebSocket functionality
  const isConnected = false;
  // const addMessageHandler = () => () => {}; // Unused variable

  // Handle incoming WebSocket messages
  useEffect(() => {
    // Mock implementation - no real WebSocket connection
    return () => {};
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setIsVisible(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bill_status_change':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'new_comment':
        return <Info className="h-5 w-5 text-green-500" />;
      case 'system_alert':
        return <Bell className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className={cn(
          "relative p-2 rounded-full transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          isConnected ? "text-gray-700 dark:text-gray-300" : "text-gray-400"
        )}
        title={isConnected ? "Real-time notifications" : "Connecting..."}
      >
        <Bell className="h-6 w-6" />
        
        {/* Connection indicator */}
        <div className={cn(
          "absolute -top-1 -right-1 w-3 h-3 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500"
        )} />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notifications Panel */}
      {isVisible && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Real-time Updates</h3>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1 text-xs",
                isConnected ? "text-green-600" : "text-red-600"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )} />
                {isConnected ? "Connected" : "Disconnected"}
              </div>
              {notifications.length > 0 && (
                <button type="button" onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Clear all</button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">No recent notifications</div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={cn(
                  "p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                  !notification.read && "bg-blue-50 dark:bg-blue-900/20"
                )}>
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{notification.title}</h4>
                        <button type="button" aria-label="Dismiss notification" onClick={() => removeNotification(notification.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-4 w-4" /></button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{notification.timestamp.toLocaleTimeString()}</span>
                        {!notification.read && (
                          <button type="button" onClick={() => markAsRead(notification.id)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Mark as read</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RealTimeNotifications;
