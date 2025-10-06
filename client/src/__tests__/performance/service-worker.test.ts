import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock service worker registration
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: 'http://localhost:3000/',
  update: vi.fn(),
  unregister: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock service worker
const mockServiceWorker = {
  scriptURL: 'http://localhost:3000/sw.js',
  state: 'activated',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  postMessage: vi.fn(),
};

// Mock navigator.serviceWorker
const mockServiceWorkerContainer = {
  register: vi.fn(),
  getRegistration: vi.fn(),
  getRegistrations: vi.fn(),
  ready: Promise.resolve(mockServiceWorkerRegistration),
  controller: mockServiceWorker,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock cache API
const mockCache = {
  match: vi.fn(),
  matchAll: vi.fn(),
  add: vi.fn(),
  addAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
};

const mockCaches = {
  open: vi.fn(() => Promise.resolve(mockCache)),
  match: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
};

// Service Worker utility class for testing
class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = true;
  private cache: Cache | null = null;

  constructor() {
    this.setupOnlineOfflineListeners();
  }

  async register(scriptURL: string): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register(scriptURL);
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  async unregister(): Promise<boolean> {
    if (this.registration) {
      return await this.registration.unregister();
    }
    return false;
  }

  async initializeCache(cacheName: string): Promise<void> {
    this.cache = await caches.open(cacheName);
  }

  async cacheResources(resources: string[]): Promise<void> {
    if (!this.cache) {
      throw 