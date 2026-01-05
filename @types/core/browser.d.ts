/**
 * Core browser type declarations
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
}

export interface BrowserCapabilities {
  webGL: boolean;
  webWorkers: boolean;
  serviceWorkers: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webSockets: boolean;
}

export interface BrowserCompatibility {
  supported: boolean;
  issues: string[];
  recommendations: string[];
}
