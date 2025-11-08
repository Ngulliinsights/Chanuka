// Script to unregister service workers
async function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Service worker unregistered:', registration.scope);
    }
    console.log('All service workers unregistered');
    window.location.reload();
  }
}

unregisterServiceWorkers().catch(console.error);