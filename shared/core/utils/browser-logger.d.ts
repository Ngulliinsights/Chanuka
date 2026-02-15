/**
 * TypeScript declaration merging for Window interface
 * Properly extends the global Window interface with custom properties
 * 
 * Requirements: 4.4, 16.2
 */

import type { BrowserLogger } from './browser-logger';

declare global {
  interface Window {
    browserLogger?: BrowserLogger;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  interface Navigator {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  }
}

export {};
