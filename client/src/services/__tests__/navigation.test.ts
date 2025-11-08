import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { navigationService, BrowserNavigationService, NavigationService } from '../navigation';

// Mock window.location
const mockLocation = {
  href: 'https://example.com/current',
  pathname: '/current',
  origin: 'https://example.com',
  hostname: 'example.com',
  port: '',
  protocol: 'https:',
  search: '?query=test',
  hash: '#section',
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
const mockHistory = {
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  pushState: vi.fn(),
  replaceState: vi.fn(),
};
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

describe('BrowserNavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BrowserNavigationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reload', () => {
    it('should call window.location.reload', () => {
      service.reload();

      expect(mockLocation.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigate', () => {
    it('should set window.location.href to the provided path', () => {
      const path = '/new-path';

      service.navigate(path);

      expect(mockLocation.href).toBe(path);
    });

    it('should handle full URLs', () => {
      const url = 'https://external.com/path';

      service.navigate(url);

      expect(mockLocation.href).toBe(url);
    });
  });

  describe('goBack', () => {
    it('should call window.history.back', () => {
      service.goBack();

      expect(mockHistory.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('replace', () => {
    it('should call window.history.replaceState with correct parameters', () => {
      const path = '/replace-path';

      service.replace(path);

      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', path);
    });
  });

  describe('getLocation', () => {
    it('should return the current location information', () => {
      const location = service.getLocation();

      expect(location).toEqual({
        pathname: '/current',
        href: 'https://example.com/current',
        origin: 'https://example.com',
        hostname: 'example.com',
        port: '',
        protocol: 'https:',
        search: '?query=test',
        hash: '#section',
      });
    });

    it('should return updated location when window.location changes', () => {
      // Update mock location
      mockLocation.pathname = '/updated';
      mockLocation.href = 'https://example.com/updated';

      const location = service.getLocation();

      expect(location.pathname).toBe('/updated');
      expect(location.href).toBe('https://example.com/updated');
    });
  });
});

describe('navigationService instance', () => {
  it('should be an instance of BrowserNavigationService', () => {
    expect(navigationService).toBeInstanceOf(BrowserNavigationService);
  });

  it('should implement NavigationService interface', () => {
    expect(typeof navigationService.reload).toBe('function');
    expect(typeof navigationService.navigate).toBe('function');
    expect(typeof navigationService.goBack).toBe('function');
    expect(typeof navigationService.replace).toBe('function');
    expect(typeof navigationService.getLocation).toBe('function');
  });
});

// Test edge cases and error conditions
describe('BrowserNavigationService edge cases', () => {
  let service: NavigationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BrowserNavigationService();
  });

  it('should handle empty path in navigate', () => {
    service.navigate('');

    expect(mockLocation.href).toBe('');
  });

  it('should handle special characters in path', () => {
    const path = '/path with spaces & symbols?query=value#hash';

    service.navigate(path);

    expect(mockLocation.href).toBe(path);
  });

  it('should handle replace with empty path', () => {
    service.replace('');

    expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '');
  });

  it('should return consistent location object structure', () => {
    const location1 = service.getLocation();
    const location2 = service.getLocation();

    expect(location1).toEqual(location2);
    expect(Object.keys(location1)).toEqual([
      'pathname',
      'href',
      'origin',
      'hostname',
      'port',
      'protocol',
      'search',
      'hash',
    ]);
  });
});