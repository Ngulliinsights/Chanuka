// Development Debugging Utilities
// This module provides debugging utilities specifically for development mode

import React from 'react';
import { logger } from '@shared/core';

interface DebugInfo {
  environment: string;
  timestamp: string;
  performance: any;
  errors: any[];
  hmrStatus: string;
  devServer: any;
  buildInfo: any;
  browserInfo: any;
  networkInfo: any;
}

export class DevelopmentDebugger {
  private static instance: DevelopmentDebugger;

  private constructor() {
    if (process.env.NODE_ENV === 'development') {
      this.setupDebugConsole();
      this.setupKeyboardShortcuts();
    }
  }

  public static getInstance(): DevelopmentDebugger {
    if (!DevelopmentDebugger.instance) {
      DevelopmentDebugger.instance = new DevelopmentDebugger();
    }
    return DevelopmentDebugger.instance;
  }

  private setupDebugConsole(): void {
    // Add debug utilities to window object
    (window as any).__DEBUG__ = {
      // Get comprehensive debug information
      getInfo: () => this.getDebugInfo(),
      
      // Clear all caches and reload
      clearAndReload: () => {
        if (window.__DEV_SERVER__) {
          window.__DEV_SERVER__.clearCache();
        } else {
          this.clearAllCaches();
        }
        window.location.reload();
      },
      
      // Get error history
      getErrors: () => {
        try {
          return JSON.parse(sessionStorage.getItem('dev_errors') || '[]');
        } catch (e) {
          return [];
        }
      },
      
      // Test HMR connection
      testHMR: () => this.testHMRConnection(),
      
      // Get performance metrics
      getPerformance: () => this.getPerformanceMetrics(),
      
      // Simulate various errors for testing
      simulateError: (type: string) => this.simulateError(type),
      
      // Get network information
      getNetworkInfo: () => this.getNetworkInfo(),
      
      // Export debug data
      exportDebugData: () => this.exportDebugData(),
      
      // Show debug panel
      showDebugPanel: () => this.showDebugPanel(),
    };

    // Log debug utilities availability
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

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+D - Show debug panel
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.showDebugPanel();
      }
      
      // Ctrl+Shift+R - Clear cache and reload
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        (window as any).__DEBUG__.clearAndReload();
      }
      
      // Ctrl+Shift+E - Show error history
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        console.table((window as any).__DEBUG__.getErrors());
      }
    });
  }

  private getDebugInfo(): DebugInfo {
    return {
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      performance: this.getPerformanceMetrics(),
      errors: this.getErrorHistory(),
      hmrStatus: this.getHMRStatus(),
      devServer: window.__DEV_SERVER__ || null,
      buildInfo: this.getBuildInfo(),
      browserInfo: this.getBrowserInfo(),
      networkInfo: this.getNetworkInfo(),
    };
  }

  private getPerformanceMetrics(): any {
    if (!performance) return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource');
    const measures = performance.getEntriesByType('measure');

    return {
      navigation: navigation ? {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart),
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
      } : null,
      resources: resources.length,
      measures: measures.length,
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
      } : null,
    };
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? Math.round(firstPaint.startTime) : null;
  }

  private getFirstContentfulPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : null;
  }

  private getErrorHistory(): any[] {
    try {
      return JSON.parse(sessionStorage.getItem('dev_errors') || '[]');
    } catch (e) {
      return [];
    }
  }

  private getHMRStatus(): string {
    if (window.__vite_plugin_react_preamble_installed__) {
      return 'Active';
    }
    return 'Not Available';
  }

  private getBuildInfo(): any {
    return {
      nodeEnv: process.env.NODE_ENV,
      buildTime: process.env.REACT_APP_BUILD_TIME || 'unknown',
      viteVersion: process.env.npm_package_dependencies_vite || 'unknown',
      reactVersion: React.version,
    };
  }

  private getBrowserInfo(): any {
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

  private getNetworkInfo(): any {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
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

  private async testHMRConnection(): Promise<void> {
    const hmrPort = window.__DEV_SERVER__?.hmrPort || (parseInt(window.location.port) + 1);
    const wsUrl = `ws://${window.location.hostname}:${hmrPort}`;
    
    console.log(`🔌 Testing HMR connection to ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        logger.error('❌ HMR connection test timeout', { component: 'Chanuka' });
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        logger.info('✅ HMR connection test successful', { component: 'Chanuka' });
        ws.close();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        logger.error('❌ HMR connection test failed:', { component: 'Chanuka' }, error);
      };
      
    } catch (error) {
      logger.error('❌ HMR connection test error:', { component: 'Chanuka' }, error);
    }
  }

  private simulateError(type: string): void {
    console.log(`🧪 Simulating ${type} error for testing`);
    
    switch (type) {
      case 'javascript':
        throw new Error('Simulated JavaScript error for testing');
      
      case 'promise':
        Promise.reject(new Error('Simulated promise rejection for testing'));
        break;
      
      case 'resource':
        const script = document.createElement('script');
        script.src = '/non-existent-script.js';
        document.head.appendChild(script);
        break;
      
      case 'network':
        fetch('/non-existent-endpoint').catch(() => {
          logger.info('Simulated network error', { component: 'Chanuka' });
        });
        break;
      
      default:
        console.warn('Unknown error type:', type);
        logger.info('Available types: javascript, promise, resource, network', { component: 'Chanuka' });
    }
  }

  private clearAllCaches(): void {
    // Clear browser caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Clear storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  }

  private exportDebugData(): void {
    const debugData = this.getDebugInfo();
    const dataStr = JSON.stringify(debugData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `debug-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    
    logger.info('📁 Debug data exported', { component: 'Chanuka' });
  }

  private showDebugPanel(): void {
    // Remove existing panel if it exists
    const existingPanel = document.getElementById('dev-debug-panel');
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    const debugInfo = this.getDebugInfo();
    
    const panel = document.createElement('div');
    panel.id = 'dev-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      width: 400px;
      max-height: 80vh;
      background: #1e1e2e;
      color: #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
      font-size: 12px;
      overflow: hidden;
    `;
    
    panel.innerHTML = `
      <div style="background: #4ecdc4; color: #1e1e2e; padding: 12px 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
        <span>🔧 Development Debug Panel</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #1e1e2e; font-size: 16px; cursor: pointer;">×</button>
      </div>
      <div style="padding: 16px; max-height: calc(80vh - 50px); overflow-y: auto;">
        <div style="margin-bottom: 16px;">
          <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Environment</div>
          <div>Mode: ${debugInfo.environment}</div>
          <div>HMR: ${debugInfo.hmrStatus}</div>
          <div>Online: ${debugInfo.networkInfo.online ? 'Yes' : 'No'}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Performance</div>
          ${debugInfo.performance?.navigation ? `
            <div>DOM Ready: ${debugInfo.performance.navigation.domContentLoaded}ms</div>
            <div>Load Complete: ${debugInfo.performance.navigation.loadComplete}ms</div>
            ${debugInfo.performance.navigation.firstPaint ? `<div>First Paint: ${debugInfo.performance.navigation.firstPaint}ms</div>` : ''}
          ` : '<div>No performance data</div>'}
          ${debugInfo.performance?.memory ? `
            <div>Memory: ${debugInfo.performance.memory.used} / ${debugInfo.performance.memory.limit}</div>
          ` : ''}
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #4ecdc4; font-weight: 600; margin-bottom: 8px;">Errors (${debugInfo.errors.length})</div>
          ${debugInfo.errors.length > 0 ? 
            debugInfo.errors.slice(-3).map(error => `
              <div style="background: #2a2a42; padding: 8px; margin: 4px 0; border-radius: 4px; border-left: 3px solid #ff6b6b;">
                <div style="color: #ff6b6b; font-weight: 600;">${error.type}</div>
                <div style="font-size: 11px; opacity: 0.8;">${error.message?.substring(0, 50)}...</div>
              </div>
            `).join('') : 
            '<div style="opacity: 0.6;">No errors</div>'
          }
        </div>
        
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="__DEBUG__.clearAndReload()" style="background: #6c5ce7; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Clear & Reload</button>
          <button onclick="__DEBUG__.testHMR()" style="background: #00b894; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Test HMR</button>
          <button onclick="__DEBUG__.exportDebugData()" style="background: #fdcb6e; color: #2d3436; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Export Data</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
  }
}

// Initialize development debugger in development mode
if (process.env.NODE_ENV === 'development') {
  DevelopmentDebugger.getInstance();
}

export default DevelopmentDebugger;











































