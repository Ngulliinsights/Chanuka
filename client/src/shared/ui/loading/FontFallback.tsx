import { useEffect, useState } from 'react';

/**
 * Font fallback configuration
 */
export interface FontFallbackConfig {
  primary: string;
  fallbacks: string[];
  generic: 'serif' | 'sans-serif' | 'monospace' | 'cursive' | 'fantasy';
}

/**
 * Font fallback hook options
 */
export interface UseFontFallbackOptions {
  timeout?: number;
  enableSwap?: boolean;
}

/**
 * Common font stacks with fallbacks
 */
export const FONT_STACKS: Record<string, FontFallbackConfig> = {
  'Inter': {
    primary: 'Inter',
    fallbacks: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto'],
    generic: 'sans-serif'
  },
  'Roboto': {
    primary: 'Roboto',
    fallbacks: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI'],
    generic: 'sans-serif'
  },
  'system': {
    primary: '-apple-system',
    fallbacks: ['BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue'],
    generic: 'sans-serif'
  }
};

/**
 * Hook for font fallback with loading states
 */
export function useFontFallback(
  config: FontFallbackConfig | string,
  options: UseFontFallbackOptions = {}
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { timeout = 3000, enableSwap = true } = options;

  const fontConfig = typeof config === 'string' 
    ? FONT_STACKS[config] || { primary: config, fallbacks: [], generic: 'sans-serif' }
    : config;

  const fontFamilyValue = [
    fontConfig.primary,
    ...fontConfig.fallbacks,
    fontConfig.generic
  ].join(', ');

  useEffect(() => {
    if (typeof window === 'undefined' || !('FontFace' in window)) {
      setIsLoaded(true);
      return;
    }

    let mounted = true;

    const loadFont = async () => {
      try {
        const fontFace = new FontFace(fontConfig.primary, `url(${fontConfig.primary})`);
        await fontFace.load();
        
        if (mounted) {
          document.fonts.add(fontFace);
          setIsLoaded(true);
        }
      } catch (error) {
        if (mounted) {
          setHasError(true);
          setIsLoaded(true); // Still set loaded to use fallbacks
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (mounted && !isLoaded) {
        setHasError(true);
        setIsLoaded(true);
      }
    }, timeout);

    loadFont();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [fontConfig.primary, timeout, enableSwap]);

  return {
    isLoaded,
    hasError,
    fontFamily: fontFamilyValue,
    style: {
      fontFamily: fontFamilyValue,
      fontDisplay: enableSwap ? 'swap' : 'auto'
    }
  };
}

/**
 * Preload fonts utility
 */
export function preloadFonts(fonts: Array<string | FontFallbackConfig>): Promise<void[]> {
  if (typeof window === 'undefined' || !('FontFace' in window)) {
    return Promise.resolve([]);
  }

  const promises = fonts.map((font) => {
    const config = typeof font === 'string'
      ? FONT_STACKS[font] || { primary: font, fallbacks: [], generic: 'sans-serif' }
      : font;

    const fontFace = new FontFace(config.primary, `url(${config.primary})`);
    
    return fontFace.load()
      .then(() => {
        document.fonts.add(fontFace);
      })
      .catch(() => {
        // Silently fail for font loading
      });
  });

  return Promise.all(promises);
}

export default useFontFallback;