/**
 * Background Sync Manager
 * Manages offline actions and coordinates with service worker for background sync
 */

import { logger } from './logger';
import { sendMessageToServiceWorker } from './serviceWorker';

export interface OfflineAction {
  type: string;
  endpoint: string;
  method: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  maxRetries: number;
}

export interface SyncStatus {
  queueLength: number;
  lastSyncTime: number | null;
  pendingActions: OfflineAction[];
}

class BackgroundSyncManager {
  private isInitialized = false;
  private autoSyncCleanup: (() => void) | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register for background sync if supported
      if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('background-sync');
        logger.info('Background sync registered', { component: 'BackgroundSyncManager' });
      }

      this.isInitialized = true;
      logger.info('Background sync manager initialized', { component: 'BackgroundSyncManager' });
    } catch (error) {
      logger.error('Failed to initialize background sync manager', { component: 'BackgroundSyncManager', error });
    }
  }

  async addOfflineAction(action: OfflineAction): Promise<void> {
    try {
      await sendMessageToServiceWorker({
        type: 'ADD_OFFLINE_ACTION',
        action,
      });
      logger.info('Offline action added to queue', { component: 'BackgroundSyncManager', actionType: action.type });
    } catch (error) {
      logger.error('Failed to add offline action', { component: 'BackgroundSyncManager', error });
      throw error;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const response = await sendMessageToServiceWorker({
        type: 'GET_SYNC_STATUS',
      });
      return response.status;
    } catch (error) {
      logger.error('Failed to get sync status', { component: 'BackgroundSyncManager', error });
      throw error;
    }
  }

  async triggerSync(): Promise<void> {
    try {
      await sendMessageToServiceWorker({
        type: 'TRIGGER_SYNC',
      });
      logger.info('Manual sync triggered', { component: 'BackgroundSyncManager' });
    } catch (error) {
      logger.error('Failed to trigger sync', { component: 'BackgroundSyncManager', error });
      throw error;
    }
  }

  async clearOfflineData(): Promise<void> {
    try {
      await sendMessageToServiceWorker({
        type: 'CLEAR_OFFLINE_DATA',
      });
      logger.info('Offline data cleared', { component: 'BackgroundSyncManager' });
    } catch (error) {
      logger.error('Failed to clear offline data', { component: 'BackgroundSyncManager', error });
      throw error;
    }
  }

  // Cleanup method to remove event listeners
  cleanup(): void {
    if (this.autoSyncCleanup) {
      this.autoSyncCleanup();
      this.autoSyncCleanup = null;
      logger.info('Background sync manager cleaned up', { component: 'BackgroundSyncManager' });
    }
  }

  // Convenience methods for common actions
  async queueApiRequest(
    method: string,
    endpoint: string,
    data?: any,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const action: OfflineAction = {
      type: 'api_request',
      endpoint,
      method,
      data,
      priority,
      maxRetries: 3,
    };

    await this.addOfflineAction(action);
  }

  async queueBillComment(bill_id: number, comment: any): Promise<void> { await this.queueApiRequest(
      'POST',
      `/api/bills/${bill_id }/comments`,
      comment,
      'high'
    );
  }

  async queueUserPreferences(preferences: any): Promise<void> {
    await this.queueApiRequest(
      'PUT',
      '/api/users/preferences',
      preferences,
      'low'
    );
  }

  async queueEngagement(bill_id: number, engagement: any): Promise<void> { await this.queueApiRequest(
      'POST',
      `/api/bills/${bill_id }/engagement`,
      engagement,
      'medium'
    );
  }

  // Auto-sync when coming back online
  setupAutoSync(): () => void {
    if (typeof window === 'undefined') return () => {};

    // Clean up existing listener if any
    if (this.autoSyncCleanup) {
      this.autoSyncCleanup();
    }

    const handleOnline = () => {
      logger.info('Connection restored, triggering sync', { component: 'BackgroundSyncManager' });
      this.triggerSync().catch(error => {
        logger.error('Auto-sync failed', { component: 'BackgroundSyncManager', error });
      });
    };

    window.addEventListener('online', handleOnline);

    // Store cleanup function
    this.autoSyncCleanup = () => {
      window.removeEventListener('online', handleOnline);
    };

    // Return cleanup function for external use
    return this.autoSyncCleanup;
  }
}

// Global instance
export const backgroundSyncManager = new BackgroundSyncManager();

// Initialize on module load
if (typeof window !== 'undefined') {
  backgroundSyncManager.initialize().catch(error => {
    logger.error('Failed to initialize background sync manager', { component: 'BackgroundSyncManager', error });
  });

  // Setup auto-sync and store cleanup function
  const cleanup = backgroundSyncManager.setupAutoSync();

  // Add cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cleanup();
  });
}

