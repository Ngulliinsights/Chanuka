import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { requestInterceptors, processRequestInterceptors } from '@client/apiInterceptors';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock document
const mockDocument = {
  querySelector: vi.fn(),
};
Object.defineProperty(window, 'document', {
  value: mockDocument,
  writable: true,
});

describe('API Interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestInterceptors array', () => {
    it('should contain the auth header interceptor', () => {
      expect(requestInterceptors).toHaveLength(1);
      expect(typeof requestInterceptors[0]).toBe('function');
    });
  });

  describe('authHeaderInterceptor', () => {
    const interceptor = requestInterceptors[0];

    it('should return Headers instance', async () => {
      const config = {
        method: 'GET',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers).toBeInstanceOf(Headers);
    });

    it('should add authorization header when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');

      const config = {
        method: 'GET',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should not add authorization header when no token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const config = {
        method: 'GET',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect((result.headers as Headers).get('Authorization')).toBeNull();
    });

    it('should add CSRF token when meta tag exists', async () => {
      const mockMeta = { getAttribute: vi.fn().mockReturnValue('csrf-token-123') };
      mockDocument.querySelector.mockReturnValue(mockMeta);

      const config = {
        method: 'POST',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('X-CSRF-Token')).toBe('csrf-token-123');
      expect(mockDocument.querySelector).toHaveBeenCalledWith('meta[name="csrf-token"]');
    });

    it('should not add CSRF token when meta tag does not exist', async () => {
      mockDocument.querySelector.mockReturnValue(null);

      const config = {
        method: 'POST',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('X-CSRF-Token')).toBeNull();
    });

    it('should add request ID', async () => {
      const config = {
        method: 'GET',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('X-Request-ID')).toBeDefined();
      expect(typeof result.headers.get('X-Request-ID')).toBe('string');
      expect(result.headers.get('X-Request-ID')!.length).toBeGreaterThan(0);
    });

    it('should add Content-Type for POST requests when not present', async () => {
      const config = {
        method: 'POST',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should add Content-Type for PUT requests when not present', async () => {
      const config = {
        method: 'PUT',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should add Content-Type for PATCH requests when not present', async () => {
      const config = {
        method: 'PATCH',
        headers: new Headers(),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should not override existing Content-Type', async () => {
      const config = {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('Content-Type')).toBe('multipart/form-data');
    });

    it('should preserve existing headers', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');

      const config = {
        method: 'POST',
        headers: new Headers({ 'X-Custom': 'custom-value' }),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers.get('X-Custom')).toBe('custom-value');
      expect((result.headers as Headers).get('Authorization')).toBe('Bearer test-token');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle Headers object correctly', async () => {
      const config = {
        method: 'GET',
        headers: new Headers({ 'Existing': 'value' }),
      };

      const result = await interceptor({ ...config, url: '/test' });

      expect(result.headers).toBeInstanceOf(Headers);
      expect(result.headers.get('Existing')).toBe('value');
    });

    it('should generate unique request IDs', async () => {
      const config = {
        method: 'GET',
        headers: new Headers(),
      };

      const result1 = await interceptor({ ...config, url: '/test1' });
      const result2 = await interceptor({ ...config, url: '/test2' });

      const id1 = result1.headers.get('X-Request-ID');
      const id2 = result2.headers.get('X-Request-ID');

      expect(id1).not.toBe(id2);
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
    });
  });

  describe('processRequestInterceptors', () => {
    it('should apply all interceptors in sequence', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      const mockMeta = { getAttribute: vi.fn().mockReturnValue('csrf-token-123') };
      mockDocument.querySelector.mockReturnValue(mockMeta);

      const config = {
        method: 'POST',
        headers: new Headers(),
        url: '/test',
      };

      const result = await processRequestInterceptors(config);

      expect(result.headers.get('Authorization')).toBe('Bearer test-token');
      expect(result.headers.get('X-CSRF-Token')).toBe('csrf-token-123');
      expect(result.headers.get('X-Request-ID')).toBeDefined();
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle interceptor errors gracefully', async () => {
      // Create a failing interceptor
      const failingInterceptor = vi.fn().mockRejectedValue(new Error('Interceptor failed'));
      const originalInterceptors = [...requestInterceptors];
      (requestInterceptors as any).push(failingInterceptor);

      const config = {
        method: 'GET',
        headers: new Headers(),
        url: '/test',
      };

      await expect(processRequestInterceptors(config)).rejects.toThrow('Interceptor failed');

      // Restore original interceptors
      requestInterceptors.length = 0;
      requestInterceptors.push(...originalInterceptors);
    });

    it('should pass the result of one interceptor to the next', async () => {
      // Add a second interceptor that modifies the result
      const secondInterceptor = vi.fn().mockImplementation((config) => {
        const headers = new Headers(config.headers);
        headers.set('X-Second', 'modified');
        return { ...config, headers };
      });

      const originalInterceptors = [...requestInterceptors];
      (requestInterceptors as any).push(secondInterceptor);

      const config = {
        method: 'GET',
        headers: new Headers(),
        url: '/test',
      };

      const result = await processRequestInterceptors(config);

      expect(result.headers.get('X-Second')).toBe('modified');

      // Restore original interceptors
      requestInterceptors.length = 0;
      requestInterceptors.push(...originalInterceptors);
    });

    it('should preserve the original config structure', async () => {
      const config = {
        method: 'GET',
        headers: new Headers(),
        url: '/test',
        body: 'test body',
        mode: 'cors' as RequestMode,
      };

      const result = await processRequestInterceptors(config);

      expect(result.url).toBe('/test');
      expect(result.method).toBe('GET');
      expect(result.body).toBe('test body');
      expect(result.mode).toBe('cors');
      expect(result.headers).toBeInstanceOf(Headers);
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      // Access the internal function (it's not exported, so we test through the interceptor)
      const config = {
        method: 'GET',
        headers: new Headers(),
      };

      // Call interceptor multiple times and check IDs are different
      const ids = [];
      for (let i = 0; i < 10; i++) {
        interceptor({ ...config, url: '/test' }).then(result => {
          ids.push(result.headers.get('X-Request-ID'));
        });
      }

      // Wait for all promises (simplified for test)
      return new Promise(resolve => {
        setTimeout(() => {
          expect(new Set(ids).size).toBe(10); // All IDs should be unique
          resolve(void 0);
        }, 100);
      });
    });
  });
});