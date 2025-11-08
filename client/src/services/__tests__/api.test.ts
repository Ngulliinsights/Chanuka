import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api, billsApi, systemApi, billsApiValidated } from '../api';
import { z } from 'zod';

// Mock dependencies
vi.mock('../utils/browser-logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../utils/client-core', () => ({
  validationService: {
    validate: vi.fn(),
  },
}));

vi.mock('../utils/env-config', () => ({
  envConfig: {
    apiUrl: 'https://api.example.com',
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/',
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('api instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBaseUrl', () => {
    it('should return the base URL', () => {
      expect(api.getBaseUrl()).toBe('https://api.example.com');
    });
  });

  describe('request method', () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue({ data: 'test' }),
      text: vi.fn().mockResolvedValue('text response'),
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue(mockResponse);
      mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    it('should make successful GET request with auth token', async () => {
      const result = await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        method: 'GET',
      });
      expect(result).toEqual({ data: 'test' });
    });

    it('should make request without auth token when not available', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });
    });

    it('should handle full URL endpoints', async () => {
      await api.get('https://external-api.com/test');

      expect(mockFetch).toHaveBeenCalledWith('https://external-api.com/test', expect.any(Object));
    });

    it('should handle POST requests with JSON data', async () => {
      const data = { key: 'value' };
      await api.post('/test', data);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('should handle POST requests with FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']));

      await api.post('/test', formData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
        method: 'POST',
        body: formData,
      });
    });

    it('should handle PUT requests', async () => {
      const data = { key: 'value' };
      await api.put('/test', data);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        method: 'PUT',
        body: JSON.stringify(data),
      });
    });

    it('should handle DELETE requests', async () => {
      await api.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        method: 'DELETE',
      });
    });

    it('should handle PATCH requests', async () => {
      const data = { key: 'value' };
      await api.patch('/test', data);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    });

    it('should handle text responses', async () => {
      mockResponse.headers.get.mockReturnValue('text/plain');
      mockResponse.text.mockResolvedValue('plain text');

      const result = await api.get('/test');

      expect(result).toBe('plain text');
    });

    it('should validate response with Zod schema', async () => {
      const schema = z.object({ data: z.string() });
      const { validationService } = await import('../utils/client-core');

      (validationService.validate as any).mockResolvedValue({ data: 'validated' });

      const result = await api.get('/test', {}, schema);

      expect(validationService.validate).toHaveBeenCalledWith(schema, { data: 'test' });
      expect(result).toEqual({ data: 'validated' });
    });

    it('should throw error on validation failure', async () => {
      const schema = z.object({ data: z.string() });
      const { validationService } = await import('../utils/client-core');

      (validationService.validate as any).mockRejectedValue(new Error('Validation failed'));

      await expect(api.get('/test', {}, schema)).rejects.toThrow('Validation failed');
    });

    it('should handle 401 unauthorized error', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(api.get('/test')).rejects.toThrow('Unauthorized');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockLocation.href).toBe('/auth');
    });

    it('should not redirect to auth if already on auth page', async () => {
      mockLocation.pathname = '/auth';
      const errorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(api.get('/test')).rejects.toThrow('Unauthorized');

      expect(mockLocation.href).toBe('');
    });

    it('should handle API error responses with custom error messages', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Resource not found' }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(api.get('/test')).rejects.toThrow('Resource not found');
    });

    it('should handle API error responses with success=false structure', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({ success: false, error: 'Bad request', code: 'VALIDATION_ERROR' }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(api.get('/test')).rejects.toMatchObject({
        message: 'Bad request',
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors in error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: vi.fn() },
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(api.get('/test')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should log errors', async () => {
      const { logger } = await import('../utils/browser-logger');
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'API request failed:',
        { component: 'ApiService', url: 'https://api.example.com/test', method: 'GET' },
        expect.any(Error)
      );
    });
  });

  describe('HTTP method wrappers', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('get method should call request with GET', async () => {
      await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('post method should call request with POST', async () => {
      const data = { test: 'data' };
      await api.post('/test', data);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(data),
      }));
    });

    it('put method should call request with PUT', async () => {
      const data = { test: 'data' };
      await api.put('/test', data);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(data),
      }));
    });

    it('delete method should call request with DELETE', async () => {
      await api.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('patch method should call request with PATCH', async () => {
      const data = { test: 'data' };
      await api.patch('/test', data);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(data),
      }));
    });
  });
});

describe('billsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ data: [] }),
    });
  });

  it('getAll should call correct endpoint', async () => {
    await billsApi.getAll({ page: 1 });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('getById should call correct endpoint', async () => {
    await billsApi.getById(123);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/123', expect.any(Object));
  });

  it('getComments should call correct endpoint', async () => {
    await billsApi.getComments(123);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/123/comments', expect.any(Object));
  });

  it('getSponsors should call correct endpoint', async () => {
    await billsApi.getSponsors(123);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/123/sponsors', expect.any(Object));
  });

  it('getAnalysis should call correct endpoint', async () => {
    await billsApi.getAnalysis(123);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/123/analysis', expect.any(Object));
  });

  it('getCategories should call correct endpoint', async () => {
    await billsApi.getCategories();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/categories', expect.any(Object));
  });

  it('getStatuses should call correct endpoint', async () => {
    await billsApi.getStatuses();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/statuses', expect.any(Object));
  });

  it('addComment should call correct endpoint with POST', async () => {
    const comment = { content: 'Test comment' };
    await billsApi.addComment(123, comment);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/123/comments', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(comment),
    }));
  });

  it('recordEngagement should call correct endpoint with POST', async () => {
    const engagement = { type: 'view', duration: 30 };
    await billsApi.recordEngagement(123, engagement);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/bills/123/engagement', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(engagement),
    }));
  });
});

describe('systemApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ status: 'ok' }),
    });
  });

  it('getHealth should call correct endpoint', async () => {
    await systemApi.getHealth();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/system/health', expect.any(Object));
  });

  it('getStats should call correct endpoint', async () => {
    await systemApi.getStats();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/system/stats', expect.any(Object));
  });

  it('getActivity should call correct endpoint', async () => {
    await systemApi.getActivity();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/system/activity', expect.any(Object));
  });

  it('getSchema should call correct endpoint', async () => {
    await systemApi.getSchema();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/system/schema', expect.any(Object));
  });

  it('getEnvironment should call correct endpoint', async () => {
    await systemApi.getEnvironment();

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/system/environment', expect.any(Object));
  });
});

describe('billsApiValidated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ data: [] }),
    });
  });

  it('should delegate to billsApi methods', async () => {
    const spy = vi.spyOn(billsApi, 'getAll');

    await billsApiValidated.getAll({ page: 1 });

    expect(spy).toHaveBeenCalledWith({ page: 1 });
  });

  it('should delegate getById to billsApi', async () => {
    const spy = vi.spyOn(billsApi, 'getById');

    await billsApiValidated.getById(123);

    expect(spy).toHaveBeenCalledWith(123);
  });

  it('should delegate getComments to billsApi', async () => {
    const spy = vi.spyOn(billsApi, 'getComments');

    await billsApiValidated.getComments(123);

    expect(spy).toHaveBeenCalledWith(123);
  });

  it('should delegate addComment to billsApi', async () => {
    const spy = vi.spyOn(billsApi, 'addComment');
    const comment = { content: 'test' };

    await billsApiValidated.addComment(123, comment);

    expect(spy).toHaveBeenCalledWith(123, comment);
  });

  it('should delegate recordEngagement to billsApi', async () => {
    const spy = vi.spyOn(billsApi, 'recordEngagement');
    const engagement = { type: 'view' };

    await billsApiValidated.recordEngagement(123, engagement);

    expect(spy).toHaveBeenCalledWith(123, engagement);
  });
});

describe('api instance', () => {
  it('should have correct base URL', () => {
    expect(api.getBaseUrl()).toBe('https://api.example.com');
  });

  it('should be defined', () => {
    expect(api).toBeDefined();
  });
});