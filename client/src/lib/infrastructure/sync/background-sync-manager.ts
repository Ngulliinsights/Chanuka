/**
 * Background Sync Manager - Shared Infrastructure
 *
 * Manages offline actions and coordinates with service worker for background sync
 */

export interface OfflineAction {
  type: string;
  endpoint: string;
  method: string;
  data?: unknown;
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
      if ('serviceWorker' in navigator && typeof ServiceWorkerRegistration !== 'undefined') {
        const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        };

        if (registration.sync && typeof registration.sync.register === 'function') {
          await registration.sync.register('background-sync');
        }
        console.log('Background sync registered');
      }

      this.isInitialized = true;
      console.log('Background sync manager initialized');
    } catch (error) {
      console.error('Failed to initialize background sync manager', error);
    }
  }

  async queueAction(action: OfflineAction): Promise<void> {
    try {
      const actions = this.getStoredActions();
      actions.push({
        ...action,
        id: Date.now().toString(),
        timestamp: Date.now(),
      });

      localStorage.setItem('offline-actions', JSON.stringify(actions));
      console.log('Action queued for background sync', action);

      // Trigger sync if online
      if (navigator.onLine) {
        await this.processQueue();
      }
    } catch (error) {
      console.error('Failed to queue action', error);
    }
  }

  async processQueue(): Promise<void> {
    const actions = this.getStoredActions();
    if (actions.length === 0) return;

    console.log(`Processing ${actions.length} queued actions`);

    for (const action of actions) {
      try {
        await this.executeAction(action);
        this.removeAction(action.id);
      } catch (error) {
        console.error('Failed to execute action', action, error);
        // Keep action in queue for retry
      }
    }
  }

  private async executeAction(action: any): Promise<void> {
    const response = await fetch(action.endpoint, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: action.data ? JSON.stringify(action.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private getStoredActions(): any[] {
    try {
      const stored = localStorage.getItem('offline-actions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private removeAction(actionId: string): void {
    const actions = this.getStoredActions();
    const filtered = actions.filter(action => action.id !== actionId);
    localStorage.setItem('offline-actions', JSON.stringify(filtered));
  }

  getSyncStatus(): SyncStatus {
    const actions = this.getStoredActions();
    return {
      queueLength: actions.length,
      lastSyncTime: actions.length > 0 ? Math.max(...actions.map(a => a.timestamp)) : null,
      pendingActions: actions,
    };
  }
  async clearOfflineData(): Promise<void> {
    localStorage.removeItem('offline-actions');
  }
}

export const backgroundSyncManager = new BackgroundSyncManager();
