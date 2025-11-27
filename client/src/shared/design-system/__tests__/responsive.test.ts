/**
 * Responsive Design System Tests
 * 
 * Tests for responsive utilities, breakpoints, and helper functions.
 * 
 * Requirements: 9.1, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  breakpoints,
  mediaQueries,
  responsiveUtils,
  touchTargets,
  gridSystem,
  responsiveSpacing,
  responsiveTypography,
} from '@client/responsive';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
  
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024,
  });
  
  mockMatchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Responsive Design System', () => {
  describe('breakpoints', () => {
    it('should have all required breakpoints', () => {
      expect(breakpoints).toHaveProperty('mobile', '0px');
      expect(breakpoints).toHaveProperty('mobile-sm', '320px');
      expect(breakpoints).toHaveProperty('mobile-lg', '480px');
      expect(breakpoints).toHaveProperty('tablet', '640px');
      expect(breakpoints).toHaveProperty('tablet-lg', '768px');
      expect(breakpoints).toHaveProperty('laptop', '1024px');
      expect(breakpoints).toHaveProperty('laptop-lg', '1280px');
      expect(breakpoints).toHaveProperty('desktop', '1440px');
      expect(breakpoints).toHaveProperty('desktop-xl', '1920px');
    });

    it('should have breakpoints in ascending order', () => {
      const values = Object.values(breakpoints).map(bp => parseInt(bp));
      const sorted = [...values].sort((a, b) => a - b);
      expect(values).toEqual(sorted);
    });
  });

  describe('mediaQueries', () => {
    it('should generate correct media queries', () => {
      expect(mediaQueries.tablet).toBe('(min-width: 640px)');
      expect(mediaQueries.laptop).toBe('(min-width: 1024px)');
      expect(mediaQueries.desktop).toBe('(min-width: 1440px)');
    });

    it('should have max-width queries', () => {
      expect(mediaQueries['max-tablet']).toBe('(max-width: 639px)');
      expect(mediaQueries['max-laptop']).toBe('(max-width: 1023px)');
    });

    it('should have device-specific queries', () => {
      expect(mediaQueries.touch).toBe('(hover: none) and (pointer: coarse)');
      expect(mediaQueries['no-touch']).toBe('(hover: hover) and (pointer: fine)');
      expect(mediaQueries.landscape).toBe('(orientation: landscape)');
      expect(mediaQueries.portrait).toBe('(orientation: portrait)');
    });

    it('should have accessibility queries', () => {
      expect(mediaQueries['reduced-motion']).toBe('(prefers-reduced-motion: reduce)');
      expect(mediaQueries['high-contrast']).toBe('(prefers-contrast: high)');
    });
  });

  describe('responsiveUtils', () => {
    describe('getCurrentBreakpoint', () => {
      it('should return mobile for small screens', () => {
        Object.defineProperty(window, 'innerWidth', { value: 300 });
        expect(responsiveUtils.getCurrentBreakpoint()).toBe('mobile');
      });

      it('should return tablet for medium screens', () => {
        Object.defineProperty(window, 'innerWidth', { value: 700 });
        expect(responsiveUtils.getCurrentBreakpoint()).toBe('tablet');
      });

      it('should return laptop for large screens', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1100 });
        expect(responsiveUtils.getCurrentBreakpoint()).toBe('laptop');
      });

      it('should return desktop for extra large screens', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1500 });
        expect(responsiveUtils.getCurrentBreakpoint()).toBe('desktop');
      });
    });

    describe('matchesBreakpoint', () => {
      it('should return false when window is undefined', () => {
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window;
        
        expect(responsiveUtils.matchesBreakpoint('tablet')).toBe(false);
        
        global.window = originalWindow;
      });

      it('should use matchMedia to check breakpoints', () => {
        mockMatchMedia.mockReturnValue({ matches: true });
        
        expect(responsiveUtils.matchesBreakpoint('tablet')).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith(mediaQueries.tablet);
      });
    });

    describe('isTouchDevice', () => {
      it('should return false when window is undefined', () => {
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window;
        
        expect(responsiveUtils.isTouchDevice()).toBe(false);
        
        global.window = originalWindow;
      });

      it('should detect touch devices', () => {
        mockMatchMedia.mockReturnValue({ matches: true });
        
        expect(responsiveUtils.isTouchDevice()).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith(mediaQueries.touch);
      });
    });

    describe('prefersReducedMotion', () => {
      it('should return false when window is undefined', () => {
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window;
        
        expect(responsiveUtils.prefersReducedMotion()).toBe(false);
        
        global.window = originalWindow;
      });

      it('should detect reduced motion preference', () => {
        mockMatchMedia.mockReturnValue({ matches: true });
        
        expect(responsiveUtils.prefersReducedMotion()).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith(mediaQueries['reduced-motion']);
      });
    });

    describe('getResponsiveValue', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1100 }); // laptop
      });

      it('should return exact match for current breakpoint', () => {
        const values = {
          mobile: 'mobile-value',
          tablet: 'tablet-value',
          laptop: 'laptop-value',
          desktop: 'desktop-value',
        };
        
        expect(responsiveUtils.getResponsiveValue(values)).toBe('laptop-value');
      });

      it('should fall back to smaller breakpoints', () => {
        const values = {
          mobile: 'mobile-value',
          tablet: 'tablet-value',
          // No laptop value
          desktop: 'desktop-value',
        };
        
        expect(responsiveUtils.getResponsiveValue(values)).toBe('tablet-value');
      });

      it('should return undefined if no matching value', () => {
        const values = {
          desktop: 'desktop-value',
          'desktop-xl': 'desktop-xl-value',
        };
        
        expect(responsiveUtils.getResponsiveValue(values)).toBeUndefined();
      });
    });
  });

  describe('touchTargets', () => {
    it('should have proper minimum sizes', () => {
      expect(touchTargets.minSize).toBe('44px');
      expect(touchTargets.recommendedSize).toBe('48px');
    });

    it('should have proper spacing values', () => {
      expect(touchTargets.minSpacing).toBe('8px');
      expect(touchTargets.recommendedSpacing).toBe('12px');
    });

    it('should have button size configurations', () => {
      expect(touchTargets.button.small).toEqual({
        minHeight: '36px',
        minWidth: '36px',
        padding: '0.5rem 0.75rem',
      });
      
      expect(touchTargets.button.medium).toEqual({
        minHeight: '44px',
        minWidth: '44px',
        padding: '0.75rem 1rem',
      });
      
      expect(touchTargets.button.large).toEqual({
        minHeight: '48px',
        minWidth: '48px',
        padding: '1rem 1.5rem',
      });
    });

    it('should have input size configurations', () => {
      expect(touchTargets.input.small).toEqual({
        minHeight: '36px',
        padding: '0.5rem 0.75rem',
      });
      
      expect(touchTargets.input.medium).toEqual({
        minHeight: '44px',
        padding: '0.75rem 1rem',
      });
      
      expect(touchTargets.input.large).toEqual({
        minHeight: '48px',
        padding: '1rem 1.25rem',
      });
    });
  });

  describe('gridSystem', () => {
    it('should have responsive column counts', () => {
      expect(gridSystem.columns.mobile).toBe(1);
      expect(gridSystem.columns['mobile-lg']).toBe(2);
      expect(gridSystem.columns.tablet).toBe(2);
      expect(gridSystem.columns['tablet-lg']).toBe(3);
      expect(gridSystem.columns.laptop).toBe(4);
      expect(gridSystem.columns['laptop-lg']).toBe(6);
      expect(gridSystem.columns.desktop).toBe(8);
      expect(gridSystem.columns['desktop-xl']).toBe(12);
    });

    it('should have responsive gap sizes', () => {
      expect(gridSystem.gaps.mobile).toBe('1rem');
      expect(gridSystem.gaps.tablet).toBe('1.5rem');
      expect(gridSystem.gaps.laptop).toBe('2rem');
      expect(gridSystem.gaps.desktop).toBe('2.5rem');
    });

    it('should have responsive container padding', () => {
      expect(gridSystem.containerPadding.mobile).toBe('1rem');
      expect(gridSystem.containerPadding.tablet).toBe('1.5rem');
      expect(gridSystem.containerPadding.laptop).toBe('2rem');
      expect(gridSystem.containerPadding.desktop).toBe('2.5rem');
    });
  });

  describe('responsiveSpacing', () => {
    it('should have mobile-first spacing values', () => {
      expect(responsiveSpacing.xs.mobile).toBe('0.25rem');
      expect(responsiveSpacing.xs.tablet).toBe('0.375rem');
      expect(responsiveSpacing.xs.laptop).toBe('0.5rem');
    });

    it('should scale spacing appropriately', () => {
      expect(responsiveSpacing.sm.mobile).toBe('0.5rem');
      expect(responsiveSpacing.md.mobile).toBe('1rem');
      expect(responsiveSpacing.lg.mobile).toBe('1.5rem');
      expect(responsiveSpacing.xl.mobile).toBe('2rem');
      expect(responsiveSpacing['2xl'].mobile).toBe('3rem');
    });
  });

  describe('responsiveTypography', () => {
    it('should have mobile-first typography scales', () => {
      expect(responsiveTypography['text-base'].mobile).toEqual({
        fontSize: '1rem',
        lineHeight: '1.5rem',
      });
      
      expect(responsiveTypography['text-base'].tablet).toEqual({
        fontSize: '1.0625rem',
        lineHeight: '1.625rem',
      });
      
      expect(responsiveTypography['text-base'].laptop).toEqual({
        fontSize: '1.125rem',
        lineHeight: '1.75rem',
      });
    });

    it('should have proper line height ratios', () => {
      const textLg = responsiveTypography['text-lg'];
      
      // Check that line heights are reasonable ratios of font sizes
      Object.values(textLg).forEach(({ fontSize, lineHeight }) => {
        const fontSizeNum = parseFloat(fontSize);
        const lineHeightNum = parseFloat(lineHeight);
        const ratio = lineHeightNum / fontSizeNum;
        
        // Line height should be between 1.2 and 1.8 times font size
        expect(ratio).toBeGreaterThanOrEqual(1.2);
        expect(ratio).toBeLessThanOrEqual(1.8);
      });
    });
  });
});

