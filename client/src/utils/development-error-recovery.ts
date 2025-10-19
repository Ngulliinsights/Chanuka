// Development Error Recovery Utilities
// This module provides enhanced error handling and recovery mechanisms for development mode

interface DevServerInfo {
  url: string;
  timestamp: string;
  startTime: number;
  hmrPort: number;
  viteVersion: string;
  reload: () => void;
  clearCache: () => void;
  hmrStatus: () => string;
  getPerformance: () => any;
}

declare global {
  interface Window {
    __DEV_SERVER__?: DevServerInfo;
    __vite_plugin_react_preamble_installed__?: boolean;
  }
}

export class DevelopmentErrorRecovery {
  private static instance: DevelopmentErrorRecovery;
  private errorCount = 0;
  private lastErrorTime = 0;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private hmrConnectionAttempts = 0;
  private maxHMRConnectionAttempts = 5;
  private isRecovering = false;

  private constructor() {
    this.setupErrorHandlers();
    this.setupHMRMonitoring();
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): DevelopmentErrorRecovery {
    if (!DevelopmentErrorRecovery.instance) {
      DevelopmentErrorRecovery.instance = new DevelopmentErrorRecovery();
    }
    return DevelopmentErrorRecovery.instance;
  }

  private setupErrorHandlers(): void {
    // Enhanced global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
      });
    });

    // Enhanced unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        error: event.reason,
        stack: event.reason?.stack,
        promise: event.promise,
      });
    });

    // Resource loading error handler
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      if (target && target !== window && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG')) {
        this.handleError({
          type: 'resource',
          message: `Failed to load ${target.tagName.toLowerCase()}: ${(target as any).src || (target as any).href}`,
          element: target,
          resourceType: target.tagName.toLowerCase(),
          resourceUrl: (target as any).src || (target as any).href,
        });
      }
    }, true);
  }

  private setupHMRMonitoring(): void {
    if (process.env.NODE_ENV !== 'development') return;

    // Monitor HMR connection status
    this.monitorHMRConnection();

    // Setup HMR error recovery
    this.setupHMRErrorRecovery();
  }

  private monitorHMRConnection(): void {
    const checkHMRConnection = () => {
      const isHMRActive = window.__vite_plugin_react_preamble_installed__;
      
      if (!isHMRActive && this.hmrConnectionAttempts < this.maxHMRConnectionAttempts) {
        this.hmrConnectionAttempts++;
        console.warn(`HMR connection attempt ${this.hmrConnectionAttempts}/${this.maxHMRConnectionAttempts}`);
        
        // Try to reconnect HMR
        this.attemptHMRReconnection();
      }
    };

    // Check HMR connection periodically
    setInterval(checkHMRConnection, 5000);
  }

  private setupHMRErrorRecovery(): void {
    // Override console.error to catch HMR errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Detect HMR-related errors
      if (this.isHMRError(message)) {
        this.handleHMRError(message, args);
      }
      
      originalConsoleError.apply(console, args);
    };
  }

  private isHMRError(message: string): boolean {
    const hmrErrorPatterns = [
      'hmr',
      'hot module replacement',
      'vite:hmr',
      'websocket',
      'eventSource',
      '[vite]',
      'chunk load error',
      'loading chunk',
    ];

    return hmrErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private handleHMRError(message: string, args: any[]): void {
    console.group('🔥 HMR Error Detected');
    logger.error('Message:', { component: 'Chanuka' }, message);
    logger.error('Arguments:', { component: 'Chanuka' }, args);
    logger.error('HMR Status:', { component: 'Chanuka' }, window.__DEV_SERVER__?.hmrStatus?.() || 'Unknown');
    logger.error('Connection Attempts:', { component: 'Chanuka' }, this.hmrConnectionAttempts);
    console.groupEnd();

    // Attempt HMR recovery
    this.attemptHMRRecovery(message);
  }

  private async attemptHMRRecovery(errorMessage: string): Promise<void> {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    
    try {
      logger.info('🔄 Attempting HMR recovery...', { component: 'Chanuka' });
      
      // Strategy 1: Try to reconnect WebSocket
      await this.attemptHMRReconnection();
      
      // Strategy 2: Clear module cache
      if (window.__DEV_SERVER__) {
        window.__DEV_SERVER__.clearCache();
      }
      
      // Strategy 3: Force full reload if HMR is completely broken
      if (this.hmrConnectionAttempts >= this.maxHMRConnectionAttempts) {
        console.warn('🔄 HMR recovery failed, forcing full reload');
        window.location.reload();
      }
      
    } catch (error) {
      logger.error('❌ HMR recovery failed:', { component: 'Chanuka' }, error);
    } finally {
      this.isRecovering = false;
    }
  }

  private async attemptHMRReconnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const hmrPort = window.__DEV_SERVER__?.hmrPort || (parseInt(window.location.port) + 1);
      const wsUrl = `ws://${window.location.hostname}:${hmrPort}`;
      
      console.log(`🔌 Attempting HMR reconnection to ${wsUrl}`);
      
      try {
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('HMR reconnection timeout'));
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          logger.info('✅ HMR reconnection successful', { component: 'Chanuka' });
          this.hmrConnectionAttempts = 0; // Reset on successful connection
          resolve();
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          logger.error('❌ HMR reconnection failed:', { component: 'Chanuka' }, error);
          reject(error);
        };
        
        ws.onclose = () => {
          clearTimeout(timeout);
          reject(new Error('HMR connection closed'));
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    if (process.env.NODE_ENV !== 'development') return;

    // Monitor long tasks that might indicate performance issues
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'longtask' && entry.duration > 100) {
              console.warn('⚠️ Long task detected in development:', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }

    // Monitor memory usage
    if ((performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usedPercent > 80) {
          console.warn('⚠️ High memory usage detected:', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
            percentage: Math.round(usedPercent) + '%',
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private handleError(errorInfo: any): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();

    // Enhanced error logging
    console.group(`🚨 Development Error #${this.errorCount} [${errorInfo.type}]`);
    logger.error('Error Info:', { component: 'Chanuka' }, errorInfo);
    logger.error('Dev Server Info:', { component: 'Chanuka' }, window.__DEV_SERVER__);
    logger.error('Recovery Attempts:', { component: 'Chanuka' }, this.recoveryAttempts);
    logger.error('Timestamp:', { component: 'Chanuka' }, new Date().toISOString());
    console.groupEnd();

    // Attempt automatic recovery for certain error types
    if (this.shouldAttemptRecovery(errorInfo)) {
      this.attemptErrorRecovery(errorInfo);
    }

    // Store error for debugging
    this.storeErrorForDebugging(errorInfo);
  }

  private shouldAttemptRecovery(errorInfo: any): boolean {
    // Don't attempt recovery if we've tried too many times recently
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      return false;
    }

    // Don't attempt recovery if the last error was very recent
    if (Date.now() - this.lastErrorTime < 1000) {
      return false;
    }

    // Only attempt recovery for certain error types
    const recoverableTypes = ['resource', 'network', 'chunk'];
    return recoverableTypes.includes(errorInfo.type);
  }

  private async attemptErrorRecovery(errorInfo: any): Promise<void> {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    this.recoveryAttempts++;

    try {
      console.log(`🔄 Attempting error recovery (${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

      if (errorInfo.type === 'resource') {
        await this.recoverFromResourceError(errorInfo);
      } else if (errorInfo.type === 'chunk') {
        await this.recoverFromChunkError(errorInfo);
      } else {
        await this.recoverFromGeneralError(errorInfo);
      }

      logger.info('✅ Error recovery completed', { component: 'Chanuka' });
      
      // Reset recovery attempts on successful recovery
      setTimeout(() => {
        this.recoveryAttempts = 0;
      }, 10000);

    } catch (recoveryError) {
      logger.error('❌ Error recovery failed:', { component: 'Chanuka' }, recoveryError);
      
      // If all recovery attempts failed, suggest manual intervention
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        this.showRecoveryFailedNotification(errorInfo);
      }
    } finally {
      this.isRecovering = false;
    }
  }

  private async recoverFromResourceError(errorInfo: any): Promise<void> {
    const { element, resourceUrl, resourceType } = errorInfo;
    
    if (element && resourceUrl) {
      console.log(`🔄 Attempting to reload ${resourceType}: ${resourceUrl}`);
      
      // Try to reload the resource with cache busting
      const newUrl = `${resourceUrl}?v=${Date.now()}`;
      
      if (resourceType === 'script') {
        const newScript = document.createElement('script');
        newScript.src = newUrl;
        newScript.onload = () => logger.info('✅ Script reloaded successfully', { component: 'Chanuka' });
        newScript.onerror = () => logger.error('❌ Script reload failed', { component: 'Chanuka' });
        document.head.appendChild(newScript);
      } else if (resourceType === 'link') {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = newUrl;
        newLink.onload = () => logger.info('✅ Stylesheet reloaded successfully', { component: 'Chanuka' });
        newLink.onerror = () => logger.error('❌ Stylesheet reload failed', { component: 'Chanuka' });
        document.head.appendChild(newLink);
      }
    }
  }

  private async recoverFromChunkError(errorInfo: any): Promise<void> {
    logger.info('🔄 Attempting chunk error recovery', { component: 'Chanuka' });
    
    // Clear module cache if available
    if (window.__DEV_SERVER__) {
      window.__DEV_SERVER__.clearCache();
    }
    
    // Wait a bit and then reload
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.location.reload();
  }

  private async recoverFromGeneralError(errorInfo: any): Promise<void> {
    logger.info('🔄 Attempting general error recovery', { component: 'Chanuka' });
    
    // Try to clear caches and reload
    if (window.__DEV_SERVER__) {
      window.__DEV_SERVER__.clearCache();
    } else {
      // Fallback cache clearing
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear storage:', e);
      }
    }
    
    // Reload after clearing caches
    setTimeout(() => window.location.reload(), 500);
  }

  private storeErrorForDebugging(errorInfo: any): void {
    try {
      const errorLog = {
        ...errorInfo,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        devServerInfo: window.__DEV_SERVER__,
        errorCount: this.errorCount,
        recoveryAttempts: this.recoveryAttempts,
      };

      // Store in sessionStorage for debugging
      const existingErrors = JSON.parse(sessionStorage.getItem('dev_errors') || '[]');
      existingErrors.push(errorLog);
      
      // Keep only the last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      sessionStorage.setItem('dev_errors', JSON.stringify(existingErrors));
    } catch (e) {
      console.warn('Failed to store error for debugging:', e);
    }
  }

  private showRecoveryFailedNotification(errorInfo: any): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
      cursor: pointer;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 20px;">🚨</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">
            Development Error Recovery Failed
          </div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">
            Error Type: ${errorInfo.type}
          </div>
          <div style="font-size: 12px;">
            Click to reload the page manually
          </div>
        </div>
      </div>
    `;
    
    notification.addEventListener('click', () => {
      window.location.reload();
    });
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  // Public methods for manual recovery
  public clearAllCaches(): void {
    if (window.__DEV_SERVER__) {
      window.__DEV_SERVER__.clearCache();
    } else {
      // Fallback cache clearing
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear storage:', e);
      }
    }
  }

  public getErrorHistory(): any[] {
    try {
      return JSON.parse(sessionStorage.getItem('dev_errors') || '[]');
    } catch (e) {
      return [];
    }
  }

  public getRecoveryStatus(): any {
    return {
      errorCount: this.errorCount,
      recoveryAttempts: this.recoveryAttempts,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      hmrConnectionAttempts: this.hmrConnectionAttempts,
      maxHMRConnectionAttempts: this.maxHMRConnectionAttempts,
      isRecovering: this.isRecovering,
      lastErrorTime: this.lastErrorTime,
    };
  }
}

// Initialize development error recovery in development mode
if (process.env.NODE_ENV === 'development') {
  DevelopmentErrorRecovery.getInstance();
  
  // Expose to global scope for debugging
  (window as any).__DEV_ERROR_RECOVERY__ = DevelopmentErrorRecovery.getInstance();
}

export default DevelopmentErrorRecovery;











































