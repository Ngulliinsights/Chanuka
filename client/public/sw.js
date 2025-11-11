/**
 * Chanuka Platform Service Worker
 * Provides offline functionality, caching, and performance optimization
 */

const CACHE_VERSION = 'chanuka-v1.2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Cache configuration
const CACHE_CONFIG = {
  static: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 100
  },
  dynamic: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxEntries: 50
  },
  api: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 100
  },
  images: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200
  }
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/Chanuka_logo.svg'
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  { pattern: /\/api\/bills/, strategy: 'staleWhileRevalidate' },
  { pattern: /\/api\/user/, strategy: 'networkFirst' },
  { pattern: /\/api\/analytics/, strategy: 'cacheFirst' }
];

// Network timeout for cache fallback
const NETWORK_TIMEOUT = 3000;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('chanuka-') && 
                     !cacheName.startsWith(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Handle API requests with appropriate caching strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheStrategy = getCacheStrategy(url.pathname);
  
  switch (cacheStrategy) {
    case 'networkFirst':
      return networkFirst(request, API_CACHE);
    case 'cacheFirst':
      return cacheFirst(request, API_CACHE);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, API_CACHE);
    default:
      return networkOnly(request);
  }
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  return cacheFirst(request, IMAGE_CACHE, CACHE_CONFIG.images);
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  return cacheFirst(request, STATIC_CACHE, CACHE_CONFIG.static);
}

/**
 * Handle dynamic requests (HTML pages) with network-first strategy
 */
async function handleDynamicRequest(request) {
  return networkFirst(request, DYNAMIC_CACHE, CACHE_CONFIG.dynamic);
}

/**
 * Network-first caching strategy
 */
async function networkFirst(request, cacheName, config = {}) {
  try {
    // Try network first with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ]);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await cleanupCache(cache, config);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

/**
 * Cache-first caching strategy
 */
async function cacheFirst(request, cacheName, config = {}) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      // Add timestamp header for expiration checking
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, responseWithTimestamp);
      await cleanupCache(cache, config);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached response even if expired
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate caching strategy
 */
async function staleWhileRevalidate(request, cacheName, config = {}) {
  const cachedResponse = await caches.match(request);
  
  // Always try to fetch fresh data in background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await cleanupCache(cache, config);
    }
    return networkResponse;
  }).catch(() => {
    // Ignore network errors in background
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  return fetchPromise;
}

/**
 * Network-only strategy (no caching)
 */
async function networkOnly(request) {
  return fetch(request);
}

/**
 * Get caching strategy for API endpoint
 */
function getCacheStrategy(pathname) {
  for (const pattern of API_CACHE_PATTERNS) {
    if (pattern.pattern.test(pathname)) {
      return pattern.strategy;
    }
  }
  return 'networkOnly';
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(new URL(request.url).pathname);
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/') ||
         /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname) ||
         STATIC_ASSETS.includes(url.pathname);
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
  if (!maxAge) return false;
  
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;
  
  const age = Date.now() - parseInt(cachedAt, 10);
  return age > maxAge;
}

/**
 * Clean up cache to respect size limits
 */
async function cleanupCache(cache, config = {}) {
  if (!config.maxEntries) return;
  
  const keys = await cache.keys();
  if (keys.length <= config.maxEntries) return;
  
  // Remove oldest entries
  const entriesToDelete = keys.length - config.maxEntries;
  const keysToDelete = keys.slice(0, entriesToDelete);
  
  await Promise.all(keysToDelete.map(key => cache.delete(key)));
  console.log(`[SW] Cleaned up ${entriesToDelete} cache entries`);
}

/**
 * Handle background sync
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Perform background sync operations
 */
async function doBackgroundSync() {
  try {
    // Sync any pending data
    console.log('[SW] Performing background sync...');
    
    // Example: sync analytics data, user preferences, etc.
    // This would integrate with your app's offline storage
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New legislative updates available',
    icon: '/Chanuka_logo.svg',
    badge: '/badge-icon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Updates',
        icon: '/action-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Chanuka Platform', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'PRELOAD_ROUTES':
      event.waitUntil(preloadRoutes(payload.routes));
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('chanuka-'))
      .map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

/**
 * Preload critical routes
 */
async function preloadRoutes(routes = []) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  const preloadPromises = routes.map(async (route) => {
    try {
      const response = await fetch(route);
      if (response.ok) {
        await cache.put(route, response);
        console.log('[SW] Preloaded route:', route);
      }
    } catch (error) {
      console.warn('[SW] Failed to preload route:', route, error);
    }
  });
  
  await Promise.allSettled(preloadPromises);
}

/**
 * Performance monitoring
 */
self.addEventListener('fetch', (event) => {
  // Track cache hit rates
  if (event.request.method === 'GET') {
    const startTime = performance.now();
    
    event.respondWith(
      (async () => {
        const response = await handleRequest(event.request);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log performance metrics
        console.log(`[SW] Request: ${event.request.url} - ${duration.toFixed(2)}ms`);
        
        return response;
      })()
    );
  }
});

/**
 * Main request handler (used by performance monitoring)
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  } else if (isImageRequest(request)) {
    return handleImageRequest(request);
  } else if (isStaticAsset(request)) {
    return handleStaticAsset(request);
  } else {
    return handleDynamicRequest(request);
  }
}

console.log('[SW] Service worker loaded successfully');