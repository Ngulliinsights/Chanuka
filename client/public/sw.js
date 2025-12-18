
// Development mode detection - prevent SW conflicts
(function() {
  const isDevelopment = 
    location.hostname === 'localhost' || 
    location.hostname === '127.0.0.1' ||
    location.port === '5173' ||
    location.port === '4200' ||
    location.port === '3000';
    
  if (isDevelopment) {
    console.log('[SW] Development mode detected - minimal functionality');
    
    // Override fetch handler to be passive in development
    
/**
 * Enhanced fetch handler with chrome-extension filtering
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip chrome-extension URLs to prevent caching errors
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // Skip invalid URLs that cause network errors
  if (url.href.includes('chrome-extension://invalid/')) {
    return;
  }
  
  // Notification API requests: Network-first with cache fallback
  if (url.pathname.includes('/api/notifications')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // Static assets: Cache-first for better performance
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Everything else: Network-only (like API calls, HTML pages)
  event.respondWith(fetch(event.request));
});
    
    return; // Skip the rest of the service worker setup
  }
})();

/**
 * Service Worker for Push Notifications
 * Optimized version with improved caching, error handling, and performance
 */

// Configuration constants - centralized for easy maintenance
const CONFIG = {
  CACHE_NAME: 'chanuka-notifications-v2',
  NOTIFICATION_CACHE: 'chanuka-notification-cache-v2',
  STATIC_CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  NOTIFICATION_CACHE_LIMIT: 100, // Maximum cached notifications
  API_TIMEOUT: 10000, // 10 seconds
  STATIC_ASSETS: [
    '/',
    '/symbol.svg',
    '/manifest.json'
  ]
};

// Default notification configuration
const DEFAULT_NOTIFICATION = {
  title: 'Chanuka Notification',
  body: 'You have a new notification',
  icon: '/symbol.svg',
  badge: '/symbol.svg',
  tag: 'chanuka-notification',
  data: {},
  requireInteraction: false,
  silent: false
};

/**
 * Installation phase - prepare the service worker
 * This happens when the service worker is first registered or updated
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Open cache and pre-cache essential resources
        const cache = await caches.open(CONFIG.CACHE_NAME);
        await cache.addAll(CONFIG.STATIC_ASSETS);
        console.log('[SW] Static assets cached successfully');
        
        // Force immediate activation without waiting for old service worker to close
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
        // Don't throw - allow installation to complete even if caching fails
      }
    })()
  );
});

/**
 * Activation phase - clean up old resources
 * This is the perfect time to remove outdated caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Remove outdated caches
        const cacheNames = await caches.keys();
        const validCaches = [CONFIG.CACHE_NAME, CONFIG.NOTIFICATION_CACHE];
        
        await Promise.all(
          cacheNames
            .filter(name => !validCaches.includes(name))
            .map(async (name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
        
        // Take control of all pages immediately
        await self.clients.claim();
        console.log('[SW] Service worker activated and claimed clients');
      } catch (error) {
        console.error('[SW] Activation error:', error);
      }
    })()
  );
});

/**
 * Push notification handler - the core of our notification system
 * Receives push messages from the server and displays them to the user
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  event.waitUntil(
    (async () => {
      try {
        // Parse and validate notification data
        const notificationData = parseNotificationData(event.data);
        
        // Display the notification with all configuration options
        await self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          tag: notificationData.tag,
          data: notificationData.data,
          actions: notificationData.actions || [],
          requireInteraction: notificationData.requireInteraction,
          silent: notificationData.silent,
          timestamp: Date.now(),
          renotify: true,
          vibrate: notificationData.silent ? undefined : [200, 100, 200]
        });
        
        // Cache notification for offline viewing and history
        await cacheNotification(notificationData);
        
        console.log('[SW] Notification displayed successfully');
      } catch (error) {
        console.error('[SW] Push notification error:', error);
        // Show fallback notification so user isn't left in the dark
        await self.registration.showNotification(
          DEFAULT_NOTIFICATION.title,
          { body: 'Error displaying notification. Please check the app.' }
        );
      }
    })()
  );
});

/**
 * Notification click handler - responds when user interacts with notifications
 * This is where we route users to the appropriate content
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  event.waitUntil(
    (async () => {
      try {
        // Determine the destination URL based on notification data
        const targetUrl = resolveTargetUrl(data, action);
        
        // Find or create appropriate window
        await focusOrOpenWindow(targetUrl);
        
        // Mark notification as read if we have an ID
        if (data.id) {
          await markNotificationAsRead(data.id);
        }
      } catch (error) {
        console.error('[SW] Notification click handling error:', error);
      }
    })()
  );
});

/**
 * Notification close handler - tracks when users dismiss notifications
 * Useful for analytics and understanding user engagement
 */
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  
  event.waitUntil(
    (async () => {
      try {
        if (data.id) {
          await trackNotificationEvent('dismissed', data.id);
        }
      } catch (error) {
        console.error('[SW] Notification close tracking error:', error);
      }
    })()
  );
});

/**
 * Background sync handler - synchronizes data when connection is restored
 * Ensures notifications stay up-to-date even after offline periods
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

/**
 * Message handler - enables communication between main thread and service worker
 * Allows the app to control service worker behavior
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  const handlers = {
    'SKIP_WAITING': () => self.skipWaiting(),
    'CACHE_NOTIFICATION': () => cacheNotification(data),
    'CLEAR_NOTIFICATION_CACHE': () => clearNotificationCache(),
    'GET_CACHE_STATUS': async () => {
      const status = await getCacheStatus();
      event.ports[0]?.postMessage(status);
    }
  };
  
  const handler = handlers[type];
  if (handler) {
    event.waitUntil(handler());
  } else {
    console.warn('[SW] Unknown message type:', type);
  }
});

/**
 * Fetch handler - implements smart caching strategies with extension filtering
 * Different strategies for different resource types optimize performance
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip chrome-extension URLs to prevent caching errors
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:' || 
      url.href.includes('chrome-extension://invalid/')) {
    return;
  }
  
  // Notification API requests: Network-first with cache fallback
  if (url.pathname.includes('/api/notifications')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // Static assets: Cache-first for better performance
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Everything else: Network-only (like API calls, HTML pages)
  event.respondWith(fetch(event.request));
});

// ============================================================================
// Helper Functions - Supporting utilities for the main event handlers
// ============================================================================

/**
 * Parses incoming push notification data with validation and defaults
 */
function parseNotificationData(pushData) {
  let parsed = { ...DEFAULT_NOTIFICATION };
  
  if (!pushData) return parsed;
  
  try {
    const payload = pushData.json();
    
    return {
      title: payload.title || parsed.title,
      body: payload.message || payload.body || parsed.body,
      icon: payload.icon || parsed.icon,
      badge: payload.badge || parsed.badge,
      tag: payload.tag || payload.id || `notification-${Date.now()}`,
      data: payload.data || payload,
      actions: payload.actions || [],
      requireInteraction: payload.priority === 'urgent',
      silent: payload.priority === 'low'
    };
  } catch (error) {
    console.error('[SW] Error parsing notification data:', error);
    return parsed;
  }
}

/**
 * Determines the target URL based on notification data and user action
 */
function resolveTargetUrl(data, action) {
  // Handle explicit dismiss action
  if (action === 'dismiss') return null;
  
  // Priority order for URL resolution
  if (action === 'view' && data.actionUrl) {
    return data.actionUrl;
  }
  
  if (data.billId) {
    return `${self.location.origin}/bills/${data.billId}`;
  }
  
  if (data.communityContext?.billId) {
    return `${self.location.origin}/bills/${data.communityContext.billId}`;
  }
  
  if (data.actionUrl) {
    return data.actionUrl;
  }
  
  return self.location.origin + '/';
}

/**
 * Focuses existing window or opens new one for the target URL
 * Improves UX by reusing existing tabs when possible
 */
async function focusOrOpenWindow(targetUrl) {
  if (!targetUrl) return;
  
  const allClients = await clients.matchAll({ 
    type: 'window', 
    includeUncontrolled: true 
  });
  
  // Try to find and focus exact URL match
  for (const client of allClients) {
    if (client.url === targetUrl) {
      return client.focus();
    }
  }
  
  // Try to navigate existing app window
  for (const client of allClients) {
    if (client.url.startsWith(self.location.origin)) {
      await client.navigate(targetUrl);
      return client.focus();
    }
  }
  
  // Open new window as last resort
  if (clients.openWindow) {
    return clients.openWindow(targetUrl);
  }
}

/**
 * Caches notification for offline access and history
 * Implements size limit to prevent unbounded cache growth
 */
async function cacheNotification(notificationData) {
  try {
    const cache = await caches.open(CONFIG.NOTIFICATION_CACHE);
    const cacheKey = new Request(`notification-${notificationData.tag}`);
    
    const response = new Response(JSON.stringify({
      ...notificationData,
      cachedAt: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(cacheKey, response);
    
    // Enforce cache size limit
    await enforceNotificationCacheLimit(cache);
    
    console.log('[SW] Notification cached:', notificationData.tag);
  } catch (error) {
    console.error('[SW] Caching notification error:', error);
  }
}

/**
 * Enforces maximum cache size by removing oldest entries
 */
async function enforceNotificationCacheLimit(cache) {
  try {
    const keys = await cache.keys();
    const notificationKeys = keys.filter(req => 
      req.url.includes('notification-')
    );
    
    if (notificationKeys.length <= CONFIG.NOTIFICATION_CACHE_LIMIT) {
      return;
    }
    
    // Get all notifications with timestamps
    const notifications = await Promise.all(
      notificationKeys.map(async (key) => {
        const response = await cache.match(key);
        const data = await response.json();
        return { key, cachedAt: data.cachedAt || 0 };
      })
    );
    
    // Sort by age and remove oldest
    notifications.sort((a, b) => a.cachedAt - b.cachedAt);
    const toDelete = notifications
      .slice(0, notifications.length - CONFIG.NOTIFICATION_CACHE_LIMIT);
    
    await Promise.all(toDelete.map(item => cache.delete(item.key)));
    
    console.log(`[SW] Removed ${toDelete.length} old notifications from cache`);
  } catch (error) {
    console.error('[SW] Cache limit enforcement error:', error);
  }
}

/**
 * Clears all cached notifications
 */
async function clearNotificationCache() {
  try {
    const deleted = await caches.delete(CONFIG.NOTIFICATION_CACHE);
    console.log('[SW] Notification cache cleared:', deleted);
    return deleted;
  } catch (error) {
    console.error('[SW] Clear cache error:', error);
    return false;
  }
}

/**
 * Network-first caching strategy for API requests
 * Tries network first, falls back to cache if offline
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetchWithTimeout(request, CONFIG.API_TIMEOUT);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CONFIG.NOTIFICATION_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) return cached;
    
    // Return offline response as last resort
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Cache-first strategy for static assets with extension URL filtering
 * Serves from cache for speed, updates cache in background
 */

/**
 * Cache-first strategy for static assets with extension URL filtering
 * Serves from cache for speed, updates cache in background
 */
async function cacheFirstStrategy(request) {
  try {
    const url = new URL(request.url);
    
    // Skip chrome-extension and other browser extension URLs
    if (url.protocol === 'chrome-extension:' || 
        url.protocol === 'moz-extension:' || 
        url.href.includes('chrome-extension://invalid/')) {
      throw new Error('Unsupported URL scheme: ' + url.protocol);
    }
    
    const cached = await caches.match(request);
    
    if (cached) {
      // Return cached version immediately
      // Update cache in background (stale-while-revalidate pattern)
      fetchAndUpdateCache(request);
      return cached;
    }
    
    // Not in cache, fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CONFIG.CACHE_NAME);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Cache-first strategy skipped for:', request.url, error.message);
    // Return a basic response for unsupported schemes
    return new Response('', { status: 200 });
  }
}

/**
 * Updates cache in background without blocking response
 */
function fetchAndUpdateCache(request) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(CONFIG.CACHE_NAME)
          .then(cache => cache.put(request, response));
      }
    })
    .catch(error => {
      console.log('[SW] Background update failed:', error.message);
    });
}

/**
 * Fetch with timeout to prevent hanging requests
 */
async function fetchWithTimeout(request, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Checks if a path represents a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Marks notification as read via API
 */
async function markNotificationAsRead(notificationId) {
  try {
    const token = await getAuthToken();
    
    const response = await fetchWithTimeout(
      new Request(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      }),
      CONFIG.API_TIMEOUT
    );
    
    if (response.ok) {
      console.log('[SW] Notification marked as read:', notificationId);
    }
  } catch (error) {
    console.error('[SW] Mark as read error:', error);
  }
}

/**
 * Tracks notification events for analytics
 */
async function trackNotificationEvent(eventType, notificationId) {
  try {
    const token = await getAuthToken();
    
    await fetchWithTimeout(
      new Request('/api/notifications/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          eventType,
          notificationId,
          timestamp: new Date().toISOString(),
          userAgent: self.navigator.userAgent
        })
      }),
      CONFIG.API_TIMEOUT
    );
  } catch (error) {
    console.error('[SW] Event tracking error:', error);
  }
}

/**
 * Synchronizes notifications when coming back online
 */
async function syncNotifications() {
  try {
    const token = await getAuthToken();
    const lastSync = await getLastSyncTime();
    
    const response = await fetchWithTimeout(
      new Request('/api/notifications/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          lastSync,
          timestamp: new Date().toISOString()
        })
      }),
      CONFIG.API_TIMEOUT
    );
    
    if (response.ok) {
      const data = await response.json();
      await setLastSyncTime(new Date().toISOString());
      
      // Notify all clients about successful sync
      const allClients = await self.clients.matchAll();
      allClients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATIONS_SYNCED',
          data
        });
      });
      
      console.log('[SW] Notifications synced:', data);
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

/**
 * Retrieves authentication token
 * Note: Implementation depends on your auth strategy
 */
async function getAuthToken() {
  try {
    const cache = await caches.open(CONFIG.NOTIFICATION_CACHE);
    const response = await cache.match('auth-token');
    
    if (response) {
      return await response.text();
    }
  } catch (error) {
    console.error('[SW] Get auth token error:', error);
  }
  
  return '';
}

/**
 * Gets last sync timestamp from cache
 */
async function getLastSyncTime() {
  try {
    const cache = await caches.open(CONFIG.NOTIFICATION_CACHE);
    const response = await cache.match('last-sync-time');
    
    if (response) {
      return await response.text();
    }
  } catch (error) {
    console.error('[SW] Get last sync time error:', error);
  }
  
  return null;
}

/**
 * Saves last sync timestamp to cache
 */
async function setLastSyncTime(timestamp) {
  try {
    const cache = await caches.open(CONFIG.NOTIFICATION_CACHE);
    await cache.put('last-sync-time', new Response(timestamp));
  } catch (error) {
    console.error('[SW] Set last sync time error:', error);
  }
}

/**
 * Gets current cache status for debugging
 */
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        return { name, entries: keys.length };
      })
    );
    
    return status;
  } catch (error) {
    console.error('[SW] Get cache status error:', error);
    return [];
  }
}

console.log('[SW] Service worker initialized and ready');