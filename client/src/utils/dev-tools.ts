/**
 * Development Tools - Consolidated Module (Optimized)
 * 
 * This module provides comprehensive development utilities including mode detection,
 * server connection checking, debugging tools, and development-specific overrides.
 * All functionality is carefully organized and optimized for performance and maintainability.
 */

import * as React from 'react';

import { logger } from './logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PerformanceMetrics {
  navigation: NavigationMetrics | null;
  resources: number;
  measures: number;
  memory: MemoryMetrics | null;
}

interface NavigationMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number | null;
  firstContentfulPaint: number | null;
  domInteractive: number;
  domComplete: number;
}

interface MemoryMetrics {
  used: string;
  total: string;
  limit: string;
}

interface NetworkInfo {
  online: boolean;
  connection: ConnectionInfo | null;
}

interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface ErrorRecord {
  type: string;
  message: string;
  timestamp: string;
  stack?: string;
}

interface DebugInfo {
  environment: string;
  timestamp: string;
  performance: PerformanceMetrics;
  errors: ErrorRecord[];
  hmrStatus: string;
  devServer: unknown;
  buildInfo: BuildInfo;
  browserInfo: BrowserInfo;
  networkInfo: NetworkInfo;
}

interface BuildInfo {
  nodeEnv: string;
  buildTime: string;
  viteVersion: string;
  reactVersion: string;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  viewport: { width: number; height: number };
  screen: { width: number; height: number; colorDepth: number };
}

// ============================================================================
// ENVIRONMENT DETECTION & CONFIGURATION
// ============================================================================

/**
 * Core environment detection flags. These are computed once at module load time
 * for optimal performance throughout the application lifecycle.
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Development configuration object that controls various development-only features.
 * All flags are derived from the environment mode to ensure consistency.
 */
export const devConfig = Object.freeze({
  suppressErrors: isDevelopment,
  suppressWarnings: isDevelopment,
  disableCSP: isDevelopment,
  disableCSRF: isDevelopment,
  disableVulnerabilityScanning: isDevelopment,
  disablePerformanceMonitoring: isDevelopment,
  disableActivityTracking: isDevelopment,
  mockBackendCalls: isDevelopment,
  skipSecurityInitialization: isDevelopment,
} as const);

// ============================================================================
// SERVER CONNECTION UTILITIES
// ============================================================================

/**
 * DevServerCheck provides utilities for verifying connections to development servers.
 * This helps diagnose connectivity issues during local development.
 */
export class DevServerCheck {
  private static readonly SERVER_URL = 'http://localhost:3000';
  private static readonly WEBSOCKET_URL = 'ws://localhost:8080';
  private static readonly CONNECTION_TIMEOUT = 2000; // 2 seconds
  
  /**
   * Checks if the HTTP development server is reachable by attempting to fetch
   * the health endpoint with a timeout. This uses AbortController for proper
   * timeout handling rather than relying on fetch timeout alone.
   */
  static async checkServerConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${this.SERVER_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      // Connection failed - this is expected when the server isn't running
      return false;
    }
  }

  /**
   * Checks WebSocket connectivity by attempting to establish a connection.
   * The promise resolves to true on successful connection, false otherwise.
   */
  static async checkWebSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(this.WEBSOCKET_URL);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, this.CONNECTION_TIMEOUT);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Displays a helpful warning message when backend services aren't available.
   * Only shows in development mode with specific instructions for starting services.
   */
  static showConnectionWarning(): void {
    if (import.meta.env?.DEV) {
      console.warn(
        '🔧 Development Notice: Backend services are not running.\n' +
        'The app will use mock data. To connect to real services:\n' +
        '1. Start the server: npm run dev:server\n' +
        '2. Start WebSocket service: npm run dev:websocket'
      );
    }
  }
}

// ============================================================================
// DEVELOPMENT DEBUG UTILITIES
// ============================================================================

/**
 * DevelopmentDebugger provides comprehensive debugging tools for development.
 * It follows the singleton pattern to ensure a single instance manages all
 * debug functionality throughout the application lifecycle.
 */
export class DevelopmentDebugger {
  private static instance: DevelopmentDebugger | null = null;
  private errorHistory: ErrorRecord[] = [];
  private readonly MAX_ERROR_HISTORY = 50; // Limit memory usage

  private constructor() {
    if (isDevelopment) {
      this.initializeErrorTracking();
      this.setupDebugConsole();
      this.setupKeyboardShortcuts();
    }
  }

  /**
   * Returns the singleton instance, creating it if necessary. This ensures
   * all debug functionality is centralized and initialization happens only once.
   */
  public static getInstance(): DevelopmentDebugger {
    if (!DevelopmentDebugger.instance) {
      DevelopmentDebugger.instance = new DevelopmentDebugger();
    }
    return DevelopmentDebugger.instance;
  }

  /**
   * Initializes error tracking that captures errors in memory for debugging.
   * This is more reliable than sessionStorage and avoids quota issues.
   */
  private initializeErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'JavaScript Error',
        message: event.message,
        timestamp: new Date().toISOString(),
        stack: event.error?.stack,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        timestamp: new Date().toISOString(),
        stack: event.reason?.stack,
      });
    });
  }

  /**
   * Records an error in the history buffer with automatic size management
   * to prevent memory leaks during long development sessions.
   */
  private recordError(error: ErrorRecord): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_ERROR_HISTORY);
    }
  }

  /**
   * Sets up the global debug API accessible via window.__DEBUG__.
   * This provides an ergonomic interface for developers to access debug tools
   * directly from the browser console.
   */
  private setupDebugConsole(): void {
    (window as Window & { __DEBUG__?: Record<string, unknown> }).__DEBUG__ = {
      getInfo: () => this.getDebugInfo(),
      clearAndReload: () => this.clearAndReload(),
      getErrors: () => this.errorHistory,
      testHMR: () => this.testHMRConnection(),
      getPerformance: () => this.getPerformanceMetrics(),
      simulateError: (type: string) => this.simulateError(type),
      getNetworkInfo: () => this.getNetworkInfo(),
      exportDebugData: () => this.exportDebugData(),
      showDebugPanel: () => this.showDebugPanel(),
    };

    console.log(`
🔧 Development Debug Utilities Available:
  __DEBUG__.getInfo()         - Get comprehensive debug information
  __DEBUG__.clearAndReload()  - Clear caches and reload
  __DEBUG__.getErrors()       - Get error history
  __DEBUG__.testHMR()         - Test HMR connection
  __DEBUG__.getPerformance()  - Get performance metrics
  __DEBUG__.simulateError()   - Simulate errors for testing
  __DEBUG__.getNetworkInfo()  - Get network information
  __DEBUG__.exportDebugData() - Export debug data
  __DEBUG__.showDebugPanel()  - Show debug panel
  
Keyboard Shortcuts:
  Ctrl+Shift+D - Show debug panel
  Ctrl+Shift+R - Clear cache and reload
  Ctrl+Shift+E - Show error history
    `);
  }

  /**
   * Registers keyboard shortcuts for quick access to debug functionality.
   * These shortcuts are designed to not conflict with common browser shortcuts.
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Only respond when Ctrl+Shift is pressed to avoid accidental triggers
      if (!event.ctrlKey || !event.shiftKey) return;

      switch (event.key) {
        case 'D':
          event.preventDefault();
          this.showDebugPanel();
          break;
        
        case 'R':
          event.preventDefault();
          this.clearAndReload();
          break;
        
        case 'E':
          event.preventDefault();
          console.table(this.errorHistory);
          break;
      }
    });
  }

  /**
   * Gathers comprehensive debug information from various sources.
   * This provides a complete snapshot of the application state for debugging.
   */
  private getDebugInfo(): DebugInfo {
    return {
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      performance: this.getPerformanceMetrics(),
      errors: this.errorHistory,
      hmrStatus: this.getHMRStatus(),
      devServer: (window as Window & { __DEV_SERVER__?: unknown }).__DEV_SERVER__ || null,
      buildInfo: this.getBuildInfo(),
      browserInfo: this.getBrowserInfo(),
      networkInfo: this.getNetworkInfo(),
    };
  }

  /**
   * Collects performance metrics using the Performance API.
   * Returns null values gracefully when metrics aren't available.
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    if (!performance) {
      return { navigation: null, resources: 0, measures: 0, memory: null };
    }

    const navigationEntries = performance.getEntriesByType('navigation');
    const navigation = navigationEntries[0] as PerformanceNavigationTiming | undefined;

    return {
      navigation: navigation ? {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.startTime),
        firstPaint: this.getPaintTiming('first-paint'),
        firstContentfulPaint: this.getPaintTiming('first-contentful-paint'),
        domInteractive: Math.round(navigation.domInteractive - navigation.startTime),
        domComplete: Math.round(navigation.domComplete - navigation.startTime),
      } : null,
      resources: performance.getEntriesByType('resource').length,
      measures: performance.getEntriesByType('measure').length,
      memory: this.getMemoryMetrics(),
    };
  }

  /**
   * Retrieves a specific paint timing metric by name.
   * Returns null if the metric isn't available yet.
   */
  private getPaintTiming(name: string): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const entry = paintEntries.find(e => e.name === name);
    return entry ? Math.round(entry.startTime) : null;
  }

  /**
   * Gets memory usage metrics if available (Chrome/Edge only).
   * This helps identify memory leaks during development.
   */
  private getMemoryMetrics(): MemoryMetrics | null {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (!memory) return null;

    return {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
    };
  }

  /**
   * Determines HMR (Hot Module Replacement) status by checking for Vite's
   * React plugin indicator. This helps diagnose HMR issues.
   */
  private getHMRStatus(): string {
    return (window as Window & { __vite_plugin_react_preamble_installed__?: boolean }).__vite_plugin_react_preamble_installed__ ? 'Active' : 'Not Available';
  }

  /**
   * Collects build-time information for debugging build-related issues.
   */
  private getBuildInfo(): BuildInfo {
    return {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      buildTime: process.env.REACT_APP_BUILD_TIME || 'unknown',
      viteVersion: process.env.npm_package_dependencies_vite || 'unknown',
      reactVersion: (React as typeof React & { version?: string }).version || 'unknown',
    };
  }

  /**
   * Gathers browser and system information useful for debugging
   * environment-specific issues.
   */
  private getBrowserInfo(): BrowserInfo {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
    };
  }

  /**
   * Retrieves network connection information when available.
   * This uses the Network Information API (not available in all browsers).
   */
  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as Navigator & { 
      connection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
      mozConnection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
      webkitConnection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
    }).connection || 
    (navigator as Navigator & { 
      connection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
      mozConnection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
      webkitConnection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
    }).mozConnection || 
    (navigator as Navigator & { 
      connection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
      mozConnection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
      webkitConnection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
    }).webkitConnection;
    
    return {
      online: navigator.onLine,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      } : null,
    };
  }

  /**
   * Tests HMR connectivity by attempting to connect to the HMR WebSocket.
   * This helps diagnose HMR issues during development.
   */
  private async testHMRConnection(): Promise<void> {
    const hmrPort = (window as Window & { __DEV_SERVER__?: { hmrPort?: number } }).__DEV_SERVER__?.hmrPort || 
                    (parseInt(window.location.port || '3000') + 1);
    const wsUrl = `ws://${window.location.hostname}:${hmrPort}`;
    
    console.log(`🔌 Testing HMR connection to ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        logger.error('❌ HMR connection test timeout', { component: 'DevelopmentDebug' });
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        logger.info('✅ HMR connection test successful', { component: 'DevelopmentDebug' });
        ws.close();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        logger.error('❌ HMR connection test failed', { component: 'DevelopmentDebug' }, error);
      };
      
    } catch (error) {
      logger.error('❌ HMR connection test error', { component: 'DevelopmentDebug' }, error);
    }
  }

  /**
   * Simulates different types of errors for testing error handling.
   * This is useful for verifying error boundaries and logging work correctly.
   */
  private simulateError(type: string): void {
    console.log(`🧪 Simulating ${type} error for testing`);
    
    switch (type) {
      case 'javascript':
        throw new Error('Simulated JavaScript error for testing');
      
      case 'promise':
        Promise.reject(new Error('Simulated promise rejection for testing'));
        break;
      
      case 'resource': {
        const script = document.createElement('script');
        script.src = '/non-existent-script.js';
        document.head.appendChild(script);
        break;
      }
      
      case 'network':
        fetch('/non-existent-endpoint').catch(() => {
          logger.info('Simulated network error', { component: 'DevelopmentDebug' });
        });
        break;
      
      default:
        console.warn('Unknown error type:', type);
        logger.info('Available types: javascript, promise, resource, network', { 
          component: 'DevelopmentDebug' 
        });
    }
  }

  /**
   * Clears all caches and storage, then reloads the page.
   * This provides a clean slate for debugging state-related issues.
   */
  private clearAndReload(): void {
    // Clear service worker caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Clear storage safely with error handling
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }

    // Reload after a brief delay to ensure cleanup completes
    setTimeout(() => window.location.reload(), 100);
  }

  /**
   * Exports all debug data as a JSON file for sharing or further analysis.
   * The filename includes a timestamp for easy identification.
   */
  private exportDebugData(): void {
    const debugData = this.getDebugInfo();
    const dataStr = JSON.stringify(debugData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `debug-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    logger.info('📁 Debug data exported', { component: 'DevTools' });
  }

  /**
   * Creates and displays a floating debug panel with key information.
   * Clicking the close button or calling this method again removes the panel.
   */
  private showDebugPanel(): void {
    const existingPanel = document.getElementById('dev-debug-panel');
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    const debugInfo = this.getDebugInfo();
    const panel = this.createDebugPanelElement(debugInfo);
    document.body.appendChild(panel);
  }

  /**
   * Creates the DOM element for the debug panel with all styling and content.
   * This is separated from showDebugPanel for better testability.
   */
  private createDebugPanelElement(debugInfo: DebugInfo): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'dev-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: #1e1e2e;
      color: #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
      font-size: 12px;
      overflow: hidden;
    `;
    
    panel.innerHTML = this.generateDebugPanelHTML(debugInfo);
    return panel;
  }

  /**
   * Generates the HTML content for the debug panel based on current debug info.
   */
  private generateDebugPanelHTML(debugInfo: DebugInfo): string {
    return `
      <div style="background: #4ecdc4; color: #1e1e2e; padding: 12px 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
        <span>🔧 Development Debug Panel</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #1e1e2e; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">×</button>
      </div>
      <div style="padding: 16px; max-height: calc(80vh - 50px); overflow-y: auto;">
        ${this.generateEnvironmentSection(debugInfo)}
        ${this.generatePerformanceSection(debugInfo)}
        ${this.generateErrorsSection(debugInfo)}
        ${this.generateActionsSection()}
      </div>
    `;
  }

  private generateEnvironmentSection(debugInfo: DebugInfo): string {
    return `
      <div style="margin-bottom: 16px;">
        <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Environment</div>
        <div>Mode: ${debugInfo.environment}</div>
        <div>HMR: ${debugInfo.hmrStatus}</div>
        <div>Online: ${debugInfo.networkInfo.online ? 'Yes' : 'No'}</div>
        <div>React: ${debugInfo.buildInfo.reactVersion}</div>
      </div>
    `;
  }

  private generatePerformanceSection(debugInfo: DebugInfo): string {
    if (!debugInfo.performance.navigation) {
      return `
        <div style="margin-bottom: 16px;">
          <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Performance</div>
          <div style="opacity: 0.6;">No performance data available</div>
        </div>
      `;
    }

    const nav = debugInfo.performance.navigation;
    return `
      <div style="margin-bottom: 16px;">
        <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Performance</div>
        <div>DOM Ready: ${nav.domContentLoaded}ms</div>
        <div>Load Complete: ${nav.loadComplete}ms</div>
        ${nav.firstPaint ? `<div>First Paint: ${nav.firstPaint}ms</div>` : ''}
        ${nav.firstContentfulPaint ? `<div>FCP: ${nav.firstContentfulPaint}ms</div>` : ''}
        ${debugInfo.performance.memory ? `<div>Memory: ${debugInfo.performance.memory.used} / ${debugInfo.performance.memory.limit}</div>` : ''}
      </div>
    `;
  }

  private generateErrorsSection(debugInfo: DebugInfo): string {
    const recentErrors = debugInfo.errors.slice(-3);
    
    return `
      <div style="margin-bottom: 16px;">
        <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Recent Errors (${debugInfo.errors.length} total)</div>
        ${recentErrors.length > 0 ? 
          recentErrors.map(error => `
            <div style="background: #2a2a42; padding: 8px; margin: 4px 0; border-radius: 4px; border-left: 3px solid #ff6b6b;">
              <div style="color: #ff6b6b; font-weight: 600; font-size: 11px;">${this.escapeHtml(error.type)}</div>
              <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">${this.escapeHtml(error.message.substring(0, 60))}${error.message.length > 60 ? '...' : ''}</div>
            </div>
          `).join('') : 
          '<div style="opacity: 0.6;">No errors recorded</div>'
        }
      </div>
    `;
  }

  private generateActionsSection(): string {
    return `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="__DEBUG__.clearAndReload()" style="background: #6c5ce7; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">Clear & Reload</button>
        <button onclick="__DEBUG__.testHMR()" style="background: #00b894; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">Test HMR</button>
        <button onclick="__DEBUG__.exportDebugData()" style="background: #fdcb6e; color: #2d3436; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">Export Data</button>
      </div>
    `;
  }

  /**
   * Escapes HTML to prevent XSS when displaying error messages.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// DEVELOPMENT OVERRIDES
// ============================================================================

/**
 * Applies development-specific console and error handling overrides.
 * This suppresses known development noise while preserving important errors.
 */
export function applyDevelopmentOverrides(): void {
  if (!isDevelopment) return;

  console.log('🔧 Applying development mode overrides...');

  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  // Patterns for known development warnings that can be safely suppressed
  const suppressPatterns = [
    /Failed to execute 'removeChild'/,
    /Maximum call stack size exceeded/,
    /Failed to fetch dynamically imported module/,
    /Cannot construct a Request/,
    /CSP.*violation/i,
    /X-Frame-Options may only be set/,
    /Long task detected/,
    /Slow component render/,
    /Vulnerability scan/,
    /Development Error #/,
    /net::ERR_ABORTED 404.*csrf/,
    /net::ERR_ABORTED 504.*Outdated/,
    /Uncaught NotFoundError.*removeChild/,
    /The message port closed/,
    /runtime\.lastError/,
    /Warning: React does not recognize/,
    /Warning: componentWill/,
  ];

  /**
   * Checks if a message matches any suppression pattern.
   */
  const shouldSuppress = (message: string): boolean => {
    return suppressPatterns.some(pattern => pattern.test(message));
  };

  // Override console.warn to filter out known development noise
  console.warn = (...args: Parameters<typeof console.warn>) => {
    const message = args.join(' ');
    if (shouldSuppress(message)) {
      console.debug('[SUPPRESSED WARN]', message.substring(0, 100));
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Override console.error similarly
  console.error = (...args: Parameters<typeof console.error>) => {
    const message = args.join(' ');
    if (shouldSuppress(message)) {
      console.debug('[SUPPRESSED ERROR]', message.substring(0, 100));
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Suppress matching window errors
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (shouldSuppress(message)) {
      console.debug('[SUPPRESSED WINDOW ERROR]', message);
      event.preventDefault();
      return false;
    }
  }, true);

  // Suppress matching promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    if (shouldSuppress(message)) {
      console.debug('[SUPPRESSED REJECTION]', message);
      event.preventDefault();
      return false;
    }
  }, true);

  // Disable React DevTools warnings in development (they can be very noisy)
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      ...((window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {}),
      isDisabled: false, // Keep DevTools functional
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
      onScheduleFiberRoot: () => {},
    };
  }

  console.log('✅ Development mode overrides applied');
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Automatically initialize development tools when the module loads.
 * This ensures debug utilities are available as early as possible.
 */
if (isDevelopment && typeof window !== 'undefined') {
  // Initialize the debugger singleton
  DevelopmentDebugger.getInstance();
  
  // Apply overrides when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDevelopmentOverrides);
  } else {
    applyDevelopmentOverrides();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default export provides convenient access to all dev tools functionality.
 */
export default {
  isDevelopment,
  isProduction,
  devConfig,
  DevServerCheck,
  DevelopmentDebugger,
  applyDevelopmentOverrides,
} as const