/**
 * Service Worker for Offline Functionality
 * Provides caching and offline support for critical features
 */

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
    // Get pending actions from IndexedDB
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await processAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        logger.info('Service Worker: Failed to process action:', { component: 'Chanuka' }, error);
      }
    }
  } catch (error) {
    logger.info('Service Worker: Background sync failed:', { component: 'Chanuka' }, error);
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingActions() {
  // This would integrate with IndexedDB to get pending actions
  return [];
}

async function processAction(action) {
  // This would process the pending action
  logger.info('Processing action:', { component: 'Chanuka' }, action);
}

async function removePendingAction(id) {
  // This would remove the action from IndexedDB
  logger.info('Removing action:', { component: 'Chanuka' }, id);
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
});