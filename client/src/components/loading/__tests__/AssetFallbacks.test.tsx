import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ImageFallback, SafeImage } from '../ImageFallback';
import { FontFallback } from '../FontFallback';
import { ScriptFallback } from '../ScriptFallback';
import { assetLoadingManager } from '@client/utils/asset-loading';

// Mock the asset loading manager
vi.mock('../../../utils/asset-loading', () => ({
  assetLoadingManager: {
    loadAsset: vi.fn(),
    onProgress: vi.fn(() => vi.fn()),
    getLoadingStats: vi.fn(() => ({
      loaded: 0,
      failed: 0,
      progress: { loaded: 0, total: 0, phase: 'preload' },
      connectionType: 'fast',
      isOnline: true,
      enhancementLevel: 'full',
      featureAvailability: {
        charts: true,
        maps: true,
        analytics: true,
        animations: true,
        images: true,
        fonts: true,
      },
      loadedAssets: [],
      failedAssets: [],
    })),
  },
}));

describe('Asset Fallback Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImageFallback', () => {
    it('renders image successfully', async () => {
      render(
        <ImageFallback
          src="https://example.com/test.jpg"
          alt="Test image"
        />
      );

      const img = screen.getByAltText('Test image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
    });

    it('shows placeholder when loading', () => {
      render(
        <ImageFallback
          src="https://example.com/test.jpg"
          alt="Test image"
          placeholder={<div>Loading...</div>}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows error state when image fails to load', async () => {
      // Mock a failed image load
      const mockImg = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(handler, 100);
          }
        }),
        removeEventListener: vi.fn(),
      };

      // Override the Image constructor
      global.Image = vi.fn(() => mockImg) as any;

      render(
        <ImageFallback
          src="https://example.com/broken.jpg"
          alt="Broken image"
          showError={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Image failed to load')).toBeInTheDocument();
      });
    });

    it('uses fallback image when primary fails', async () => {
      const mockImg = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(handler, 100);
          }
        }),
        removeEventListener: vi.fn(),
        src: '',
      };

      global.Image = vi.fn(() => mockImg) as any;

      render(
        <ImageFallback
          src="https://example.com/broken.jpg"
          fallbackSrc="https://example.com/fallback.jpg"
          alt="Fallback test"
        />
      );

      await waitFor(() => {
        expect(mockImg.src).toBe('https://example.com/fallback.jpg');
      });
    });
  });

  describe('SafeImage', () => {
    it('renders with built-in placeholder', () => {
      render(
        <SafeImage
          src="https://example.com/test.jpg"
          alt="Safe image"
        />
      );

      expect(screen.getByAltText('Safe image')).toBeInTheDocument();
    });
  });

  describe('FontFallback', () => {
    it('applies font family with fallbacks', () => {
      render(
        <FontFallback fontFamily="sans">
          <span>Test text</span>
        </FontFallback>
      );

      const span = screen.getByText('Test text');
      expect(span).toHaveStyle({
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
      });
    });

    it('handles custom font config', () => {
      const customConfig = {
        primary: 'CustomFont',
        fallbacks: ['Fallback1', 'Fallback2'],
        generic: 'serif' as const,
      };

      render(
        <FontFallback fontFamily={customConfig}>
          <span>Custom font text</span>
        </FontFallback>
      );

      const span = screen.getByText('Custom font text');
      expect(span).toHaveStyle({
        fontFamily: 'CustomFont, Fallback1, Fallback2, serif'
      });
    });
  });

  describe('ScriptFallback', () => {
    beforeEach(() => {
      // Mock document.head.appendChild
      document.head.appendChild = vi.fn();
      document.querySelector = vi.fn();
    });

    it('renders children when script loads successfully', async () => {
      const mockScript = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(handler, 100);
          }
        }),
        removeEventListener: vi.fn(),
      };

      document.createElement = vi.fn(() => mockScript) as any;

      render(
        <ScriptFallback src="https://example.com/script.js">
          <div>Script loaded content</div>
        </ScriptFallback>
      );

      await waitFor(() => {
        expect(screen.getByText('Script loaded content')).toBeInTheDocument();
      });
    });

    it('shows error state when script fails', async () => {
      const mockScript = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(handler, 100);
          }
        }),
        removeEventListener: vi.fn(),
        remove: vi.fn(),
      };

      document.createElement = vi.fn(() => mockScript) as any;

      render(
        <ScriptFallback src="https://example.com/broken.js">
          <div>Content</div>
        </ScriptFallback>
      );

      await waitFor(() => {
        expect(screen.getByText('Script failed to load')).toBeInTheDocument();
      });
    });

    it('tries fallback script when primary fails', async () => {
      const mockScript = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(handler, 100);
          }
        }),
        removeEventListener: vi.fn(),
        remove: vi.fn(),
        src: '',
      };

      document.createElement = vi.fn(() => mockScript) as any;

      render(
        <ScriptFallback
          src="https://example.com/broken.js"
          fallbackSrc="https://example.com/fallback.js"
        >
          <div>Fallback content</div>
        </ScriptFallback>
      );

      await waitFor(() => {
        expect(mockScript.src).toBe('https://example.com/fallback.js');
      });
    });
  });

  describe('Asset Loading Manager Integration', () => {
    it('tracks loading progress', () => {
      const mockOnProgress = vi.fn();
      assetLoadingManager.onProgress = mockOnProgress;

      render(<SafeImage src="test.jpg" alt="test" />);

      expect(mockOnProgress).toHaveBeenCalled();
    });

    it('provides loading statistics', () => {
      const stats = assetLoadingManager.getLoadingStats();

      expect(stats).toHaveProperty('enhancementLevel');
      expect(stats).toHaveProperty('featureAvailability');
      expect(stats).toHaveProperty('loadedAssets');
      expect(stats).toHaveProperty('failedAssets');
    });
  });
});

