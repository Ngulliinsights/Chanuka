/**
 * Clear Service Worker and Caches Script
 * Run this to completely remove service workers and clear all caches
 */

async function clearServiceWorkerAndCaches() {
  console.log('🧹 Clearing service workers and caches...');
  
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        console.log('Unregistering service worker:', registration.scope);
        await registration.unregister();
      }
      
      console.log(`✅ Unregistered ${registrations.length} service worker(s)`);
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        console.log('Deleting cache:', cacheName);
        await caches.delete(cacheName);
      }
      
      console.log(`✅ Cleared ${cacheNames.length} cache(s)`);
    }
    
    console.log('🎉 All service workers and caches cleared successfully!');
    console.log('💡 You may need to refresh the page to see changes.');
    
  } catch (error) {
    console.error('❌ Error clearing service workers and caches:', error);
  }
}

// Run immediately if this script is loaded
clearServiceWorkerAndCaches();

// Also expose globally for manual execution
window.clearServiceWorkerAndCaches = clearServiceWorkerAndCaches;