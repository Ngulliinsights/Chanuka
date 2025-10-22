/**
 * Service Worker for Offline Functionality
 * Provides caching and offline support for critical features
 */

// Minimal client-side logger shim for service worker
const logger = {
  debug: function() {
    // no-op in production unless __DEV_LOG__ is set
    if (typeof window !== 'undefined' && window.__DEV_LOG__) {
      console.debug.apply(console, arguments);
    }
  },
  info: function() {
    if (typeof window !== 'undefined' && window.__DEV_LOG__) {
      console.info.apply(console, arguments);
    }
  },
  warn: function() {
    console.warn.apply(console, arguments);
  },
  error: function() {
    console.error.apply(console, arguments);
  },
  child: function(meta) {
    // return same logger for simplicity
    return logger;
  },
};

const CACHE_NAME = 'chanuka-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add critical CSS and JS files here
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/bills',
  '/dashboard',
  '/search',
  '/profile'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/bills/,
  /^\/api\/auth\/verify/,
  /^\/api\/user/
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  logger.info('Service Worker: Installing...', { component: 'Chanuka' });
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        logger.info('Service Worker: Precaching assets', { component: 'Chanuka' });
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        logger.info('Service Worker: Skip waiting', { component: 'Chanuka' });
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  logger.info('Service Worker: Activating...', { component: 'Chanuka' });
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              logger.info('Service Worker: Deleting old cache:', { component: 'Chanuka' }, cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        logger.info('Service Worker: Claiming clients', { component: 'Chanuka' });
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname === '/offline.html') {
    // Always serve offline page from cache
    event.respondWith(caches.match(OFFLINE_URL));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    // API requests - cache first, then network
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.woff2')) {
    // Static assets - cache first
    event.respondWith(handleStaticAssets(request));
    return;
  }

  // Navigation requests - network first, then cache
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default strategy - network first
  event.respondWith(handleDefault(request));
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Check if this API should be cached
    const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
    
    if (!shouldCache) {
      // Don't cache, just fetch
      return await fetch(request);
    }

    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Fetch in background to update cache
      fetch(request).then(response => {
        if (response.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, response.clone()));
        }
      }).catch(() => {
        // Ignore background fetch errors
      });
      
      return cachedResponse;
    }

    // Fetch from network and cache
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;

  } catch (error) {
    logger.info('Service Worker: API request failed, checking cache:', { component: 'Chanuka' }, error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature is not available offline',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network and cache
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;

  } catch (error) {
    logger.info('Service Worker: Static asset request failed:', { component: 'Chanuka' }, error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return a basic error response
    return new Response('Asset not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle navigation requests with network-first strategy
async function handleNavigation(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;

  } catch (error) {
    logger.info('Service Worker: Navigation request failed, checking cache:', { component: 'Chanuka' }, error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Check if this is a route that should work offline
    const url = new URL(request.url);
    const isOfflineRoute = OFFLINE_ROUTES.some(route => {
      if (route === '/') {
        return url.pathname === '/';
      }
      return url.pathname.startsWith(route);
    });

    if (isOfflineRoute) {
      // Serve the offline page
      return caches.match(OFFLINE_URL);
    }

    // For other routes, return a basic offline response
    return new Response('Page not available offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
}

// Default handler for other requests
async function handleDefault(request) {
  try {
    return await fetch(request);
  } catch (error) {
    logger.info('Service Worker: Default request failed:', { component: 'Chanuka' }, error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return basic offline response
    return new Response('Content not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  logger.info('Service Worker: Background sync triggered:', { component: 'Chanuka' }, event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    logger.info('Service Worker: Starting background sync', { component: 'Chanuka' });

    // Get pending actions from IndexedDB
    const pendingActions = await getPendingActions();

    if (pendingActions.length === 0) {
      logger.info('Service Worker: No pending actions to sync', { component: 'Chanuka' });
      return;
    }

    logger.info(`Service Worker: Processing ${pendingActions.length} pending actions`, { component: 'Chanuka' });

    for (const action of pendingActions) {
      try {
        const success = await processAction(action);
        if (success) {
          await removePendingAction(action.id);
          logger.info('Service Worker: Action processed successfully', { component: 'Chanuka', actionId: action.id });
        } else {
          // Increment retry count and check if we should give up
          await updateActionRetryCount(action.id);
          const updatedAction = await getActionById(action.id);
          if (updatedAction && updatedAction.retryCount >= updatedAction.maxRetries) {
            logger.warn('Service Worker: Action failed permanently, removing', { component: 'Chanuka', actionId: action.id });
            await removePendingAction(action.id);
            await logOfflineError('sync_failure', { action: action.id, error: 'Max retries exceeded' });
          }
        }
      } catch (error) {
        logger.error('Service Worker: Failed to process action:', { component: 'Chanuka', actionId: action.id, error });
        await updateActionRetryCount(action.id);
      }
    }

    // Update last sync time
    await updateLastSyncTime();

    logger.info('Service Worker: Background sync completed', { component: 'Chanuka' });
  } catch (error) {
    logger.error('Service Worker: Background sync failed:', { component: 'Chanuka', error });
    await logOfflineError('background_sync_failure', { error: error.message });
  }
}

// IndexedDB operations for offline actions
async function getPendingActions() {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-actions'], 'readonly');
    const store = transaction.objectStore('offline-actions');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const actions = request.result;
        // Sort by priority and timestamp
        actions.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
        });
        resolve(actions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('Service Worker: Failed to get pending actions:', { component: 'Chanuka', error });
    return [];
  }
}

async function getActionById(actionId) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-actions'], 'readonly');
    const store = transaction.objectStore('offline-actions');
    const request = store.get(actionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('Service Worker: Failed to get action by ID:', { component: 'Chanuka', actionId, error });
    return null;
  }
}

async function processAction(action) {
  try {
    logger.info('Service Worker: Processing action', { component: 'Chanuka', action });

    const request = new Request(action.endpoint, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
        'X-Request-ID': generateRequestId(),
      },
      body: action.data ? JSON.stringify(action.data) : undefined,
    });

    // Add auth token if available
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(request);

    if (response.ok) {
      logger.info('Service Worker: Action processed successfully', { component: 'Chanuka', actionId: action.id });
      return true;
    } else {
      logger.warn('Service Worker: Action failed with status', { component: 'Chanuka', actionId: action.id, status: response.status });
      return false;
    }
  } catch (error) {
    logger.error('Service Worker: Action processing failed:', { component: 'Chanuka', actionId: action.id, error });
    return false;
  }
}

async function removePendingAction(actionId) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-actions'], 'readwrite');
    const store = transaction.objectStore('offline-actions');
    const request = store.delete(actionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('Service Worker: Failed to remove pending action:', { component: 'Chanuka', actionId, error });
  }
}

async function updateActionRetryCount(actionId) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-actions'], 'readwrite');
    const store = transaction.objectStore('offline-actions');
    const getRequest = store.get(actionId);

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retryCount += 1;
          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    logger.error('Service Worker: Failed to update retry count:', { component: 'Chanuka', actionId, error });
  }
}

async function updateLastSyncTime() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lastSyncTime', Date.now().toString());
    }
  } catch (error) {
    logger.error('Service Worker: Failed to update last sync time:', { component: 'Chanuka', error });
  }
}

async function logOfflineError(type, data) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-analytics'], 'readwrite');
    const store = transaction.objectStore('offline-analytics');

    const errorEvent = {
      type,
      data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: self.location.href,
    };

    store.add(errorEvent);
  } catch (error) {
    logger.error('Service Worker: Failed to log offline error:', { component: 'Chanuka', error });
  }
}

// IndexedDB initialization
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chanuka-offline-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('offline-actions')) {
        const actionsStore = db.createObjectStore('offline-actions', { keyPath: 'id' });
        actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        actionsStore.createIndex('priority', 'priority', { unique: false });
        actionsStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains('offline-analytics')) {
        const analyticsStore = db.createObjectStore('offline-analytics', { keyPath: 'id', autoIncrement: true });
        analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        analyticsStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  logger.info('Service Worker: Push notification received', { component: 'Chanuka' });
  
  const options = {
    body: 'You have new updates available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Updates',
        icon: '/icon-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Chanuka Platform', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  logger.info('Service Worker: Notification clicked', { component: 'Chanuka' });
  
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to a specific page
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  logger.info('Service Worker: Message received:', { component: 'Chanuka' }, event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data && event.data.type === 'ADD_OFFLINE_ACTION') {
    addOfflineAction(event.data.action).then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }

  if (event.data && event.data.type === 'GET_SYNC_STATUS') {
    getSyncStatus().then(status => {
      event.ports[0].postMessage({ status });
    }).catch(error => {
      event.ports[0].postMessage({ error: error.message });
    });
  }

  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    handleBackgroundSync().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }

  if (event.data && event.data.type === 'CLEAR_OFFLINE_DATA') {
    clearOfflineData().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});

// Add offline action from main thread
async function addOfflineAction(action) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-actions'], 'readwrite');
    const store = transaction.objectStore('offline-actions');

    const fullAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(fullAction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('Service Worker: Failed to add offline action:', { component: 'Chanuka', error });
    throw error;
  }
}

// Get sync status
async function getSyncStatus() {
  try {
    const pendingActions = await getPendingActions();
    const lastSyncTime = typeof localStorage !== 'undefined'
      ? localStorage.getItem('lastSyncTime')
      : null;

    return {
      queueLength: pendingActions.length,
      lastSyncTime: lastSyncTime ? parseInt(lastSyncTime) : null,
      pendingActions,
    };
  } catch (error) {
    logger.error('Service Worker: Failed to get sync status:', { component: 'Chanuka', error });
    throw error;
  }
}

// Clear all offline data
async function clearOfflineData() {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offline-actions', 'offline-analytics'], 'readwrite');

    const actionsStore = transaction.objectStore('offline-actions');
    const analyticsStore = transaction.objectStore('offline-analytics');

    await Promise.all([
      new Promise((resolve, reject) => {
        const request = actionsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = analyticsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('lastSyncTime');
    }

    logger.info('Service Worker: Offline data cleared', { component: 'Chanuka' });
  } catch (error) {
    logger.error('Service Worker: Failed to clear offline data:', { component: 'Chanuka', error });
    throw error;
  }
}




































