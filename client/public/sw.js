// Simple Service Worker for Chanuka Platform
// Lightweight logger shim for service worker scope to avoid ReferenceError
const logger = {
  info: (...args) => {
    if (typeof self !== 'undefined' && self.registration) {
      // Workers don't have console grouping in all environments; use console.log
      try { console.info('[SW]', ...args); } catch (e) {}
    } else {
      try { console.info('[SW]', ...args); } catch (e) {}
    }
  },
  warn: (...args) => { try { console.warn('[SW]', ...args); } catch (e) {} },
  error: (...args) => { try { console.error('[SW]', ...args); } catch (e) {} },
};
const CACHE_NAME = 'chanuka-v1';
const urlsToCache = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});