/**
 * Workers Infrastructure
 *
 * Service workers and web workers management
 */

export * from './service-worker';
export {
  registerServiceWorker,
  sendMessageToServiceWorker,
  isServiceWorkerAvailable,
  getNetworkStatus,
  onNetworkStatusChange,
} from './service-worker';
