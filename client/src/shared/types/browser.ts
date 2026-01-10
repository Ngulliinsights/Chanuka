/**
 * Browser-related type definitions
 */

export interface AppError {
  message: string;
  code?: string;
  stack?: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
}

export interface BrowserCapabilities {
  webGL: boolean;
  webRTC: boolean;
  serviceWorker: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  geolocation: boolean;
  notifications: boolean;
  camera: boolean;
  microphone: boolean;
}

export interface BrowserCompatibility {
  isSupported: boolean;
  missingFeatures: string[];
  recommendations: string[];
  score: number;
}
