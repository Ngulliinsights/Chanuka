/**
 * Service Worker for Push Notifications
 * 
 * Handles push notification events and provides offline functionality
 * for the Chanuka notification system.
 */

const CACHE_NAME = 'chanuka-notifications-v1';
const NOTIFICATION_CACHE = 'chanuka-notification-cache';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/favicon.ico',
        '/manifest.json'
      ]);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== NOTIFICATION_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients immediately
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'Chanuka Notification',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'chanuka-notification',
    data: {}
  };
  
  // Parse notification data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.message || payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || payload.id || notificationData.tag,
        data: payload.data || payload,
        actions: payload.actions || [],
        requireInteraction: payload.priority === 'urgent',
        silent: payload.priority === 'low'
      };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      timestamp: Date.now(),
      renotify: true
    }).then(() => {
      // Cache notification for offline access
      return cacheNotification(notificationData);
    })
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // Determine the URL to open
  let urlToOpen = '/';
  
  if (data.actionUrl) {
    urlToOpen = data.actionUrl;
  } else if (data.billId) {
    urlToOpen = `/bills/${data.billId}`;
  } else if (data.communityContext?.billId) {
    urlToOpen = `/bills/${data.communityContext.billId}`;
  }
  
  // Handle specific actions
  if (action === 'view') {
    urlToOpen = data.actionUrl || urlToOpen;
  } else if (action === 'dismiss') {
    // Just close the notification (already done above)
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Check if there's any window open to the app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'navigate' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }).then(() => {
      // Mark notification as read via API
      return markNotificationAsRead(data.id);
    })
  );
});

// Notification close event - handle notification dismissal
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  const notification = event.notification;
  const data = notification.data || {};
  
  // Track notification dismissal
  event.waitUntil(
    trackNotificationEvent('dismissed', data.id)
  );
});

// Background sync event - sync notifications when back online
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_NOTIFICATION':
      event.waitUntil(cacheNotification(data));
      break;
    case 'CLEAR_NOTIFICATION_CACHE':
      event.waitUntil(clearNotificationCache());
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Fetch event - handle network requests with caching
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle notification API requests
  if (event.request.url.includes('/api/notifications')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(NOTIFICATION_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Handle other requests with cache-first strategy for static assets
  if (event.request.url.includes('.js') || 
      event.request.url.includes('.css') || 
      event.request.url.includes('.png') || 
      event.request.url.includes('.jpg') || 
      event.request.url.includes('.ico')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Helper Functions

/**
 * Cache notification data for offline access
 */
async function cacheNotification(notificationData) {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const cacheKey = `notification-${notificationData.tag || Date.now()}`;
    
    const response = new Response(JSON.stringify(notificationData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(cacheKey, response);
    console.log('Notification cached:', cacheKey);
  } catch (error) {
    console.error('Error caching notification:', error);
  }
}

/**
 * Clear notification cache
 */
async function clearNotificationCache() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const keys = await cache.keys();
    
    const deletePromises = keys
      .filter(key => key.url.includes('notification-'))
      .map(key => cache.delete(key));
    
    await Promise.all(deletePromises);
    console.log('Notification cache cleared');
  } catch (error) {
    console.error('Error clearing notification cache:', error);
  }
}

/**
 * Mark notification as read via API
 */
async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  
  try {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });
    
    if (response.ok) {
      console.log('Notification marked as read:', notificationId);
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Track notification event for analytics
 */
async function trackNotificationEvent(eventType, notificationId) {
  if (!notificationId) return;
  
  try {
    await fetch('/api/notifications/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        eventType,
        notificationId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    });
  } catch (error) {
    console.error('Error tracking notification event:', error);
  }
}

/**
 * Sync notifications when back online
 */
async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        lastSync: await getLastSyncTime(),
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Notifications synced:', data);
      
      // Update last sync time
      await setLastSyncTime(new Date().toISOString());
      
      // Notify main thread about sync
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATIONS_SYNCED',
          data: data
        });
      });
    }
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

/**
 * Get authentication token from storage
 */
async function getAuthToken() {
  // This would need to be implemented based on your auth storage strategy
  // For now, return empty string
  return '';
}

/**
 * Get last sync time from storage
 */
async function getLastSyncTime() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const response = await cache.match('last-sync-time');
    
    if (response) {
      const data = await response.text();
      return data;
    }
  } catch (error) {
    console.error('Error getting last sync time:', error);
  }
  
  return null;
}

/**
 * Set last sync time in storage
 */
async function setLastSyncTime(timestamp) {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const response = new Response(timestamp);
    await cache.put('last-sync-time', response);
  } catch (error) {
    console.error('Error setting last sync time:', error);
  }
}

console.log('Service Worker loaded and ready for push notifications');