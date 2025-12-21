import React, { useEffect, useState } from 'react';

import { cn } from '@client/lib/utils';

/**
 * Font fallback configuration for different font families
 */
export interface FontFallbackConfig {
  primary: string;
  fallbacks: string[];
  generic: 'serif' | 'sans-serif' | 'monospace' | 'cursive' | 'fantasy';
}

/**
 * Predefined font stacks for common use cases
 */
export const FONT_STACKS: Record<string, FontFallbackConfig> = {
  // System font stacks for optimal performance
  system: {
    primary: '-apple-system, BlinkMacSystemFont',
    fallbacks: ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
    generic: 'sans-serif',
  },
  sans: {
    primary: 'Inter',
    fallbacks: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto'],
    generic: 'sans-serif',
  },
  serif: {
    primary: 'Georgia',
    fallbacks: ['Cambria', 'Times New Roman', 'Times'],
    generic: 'serif',
  },
  mono: {
    primary: 'JetBrains Mono',
    fallbacks: ['Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono'],
    generic: 'monospace',
  },
  display: {
    primary: 'Cal Sans',
    fallbacks: ['Inter', 'SF Pro Display', 'system-ui'],
    generic: 'sans-serif',
  },
);

function 1(
};

/**
 * Font loading state
 */
export interface FontLoadState {
  loaded: boolean;
  failed: boolean;
  fallback: boolean;
}

/**
 * FontFallback component that provides graceful font loading with fallbacks
 */
export interface FontFallbackProps {
  fontFamily: string | FontFallbackConfig;
  children: React.ReactNode;
  className?: string;
  onFontLoad?: (state: FontLoadState) => void;
  timeout?: number;
  enableSwap?: boolean;
}

export const FontFallback = React.memo(<FontFallbackProps> = ({
  fontFamily,
  children,
  className,
  onFontLoad,
  timeout = 3000,
  enableSwap = true,
}) => {
  const [fontState, setFontState] = useState<FontLoadState>({
    loaded: false,
    failed: false,
    fallback: false,
  });

  const config = typeof fontFamily === 'string'
    ? FONT_STACKS[fontFamily] || {
        primary: fontFamily,
        fallbacks: [],
        generic: 'sans-serif' as const
      }
    : fontFamily;

  useEffect(() => {
    if (!enableSwap || typeof window === 'undefined' || !('FontFace' in window)) {
      return;
    }

    let mounted = true;
    const fontFace = new FontFace(config.primary, `local('${config.primary}')`);

    // Check if font is already loaded
    document.fonts.load(`12px "${config.primary}"`).then((results) => {
      if (!mounted) return;

      if (results.length > 0) {
        setFontState({ loaded: true, failed: false, fallback: false });
        onFontLoad?.({ loaded: true, failed: false, fallback: false });
        return;
      }

      // Try to load the font
      const loadPromise = fontFace.load();

      // Set timeout for fallback
      const timeoutId = setTimeout(() => {
        if (!mounted) return;
        setFontState({ loaded: false, failed: true, fallback: true });
        onFontLoad?.({ loaded: false, failed: true, fallback: true });
      }, timeout);

      loadPromise
        .then(() => {
          if (!mounted) return;
          clearTimeout(timeoutId);
          document.fonts.add(fontFace);
          setFontState({ loaded: true, failed: false, fallback: false });
          onFontLoad?.({ loaded: true, failed: false, fallback: false });
        })
        .catch(() => {
          if (!mounted) return;
          clearTimeout(timeoutId);
          setFontState({ loaded: false, failed: true, fallback: true });
          onFontLoad?.({ loaded: false, failed: true, fallback: true });
        });
    });

    return () => {
      mounted = false;
    };
  }, [config.primary, timeout, enableSwap, onFontLoad]);

  // Build font-family CSS value with fallbacks
  const fontFamilyValue = [
    config.primary,
    ...config.fallbacks,
    config.generic,
  ].join(', ');

  return (
    <div
      className={cn(className)}
      style={{
        fontFamily: fontFamilyValue,
      } as React.CSSProperties}
      data-font-loaded={fontState.loaded}
      data-font-failed={fontState.failed}
      data-font-fallback={fontState.fallback}
    >
      {children}
    </div>
  );
);

function 1(
};

/**
 * Hook for managing font loading state
 */
export function useFontFallback(
  fontFamily: string | FontFallbackConfig,
  options: {
    timeout?: number;
    enableSwap?: boolean;
  } = {}
) {
  const [state, setState] = useState<FontLoadState>({
    loaded: false,
    failed: false,
    fallback: false,
  });

  const config = typeof fontFamily === 'string'
    ? FONT_STACKS[fontFamily] || {
        primary: fontFamily,
        fallbacks: [],
        generic: 'sans-serif' as const
      }
    : fontFamily;

  const fontFamilyValue = [
    config.primary,
    ...config.fallbacks,
    config.generic,
  ].join(', ');

  useEffect(() => {
    if (!options.enableSwap || typeof window === 'undefined' || !('FontFace' in window)) {
      return;
    }

    let mounted = true;
    const fontFace = new FontFace(config.primary, `local('${config.primary}')`);

    document.fonts.load(`12px "${config.primary}"`).then((results) => {
      if (!mounted) return;

      if (results.length > 0) {
        setState({ loaded: true, failed: false, fallback: false });
        return;
      }

      const loadPromise = fontFace.load();
      const timeoutId = setTimeout(() => {
        if (!mounted) return;
        setState({ loaded: false, failed: true, fallback: true });
      }, options.timeout || 3000);

      loadPromise
        .then(() => {
          if (!mounted) return;
          clearTimeout(timeoutId);
          document.fonts.add(fontFace);
          setState({ loaded: true, failed: false, fallback: false });
        })
        .catch(() => {
          if (!mounted) return;
          clearTimeout(timeoutId);
          setState({ loaded: false, failed: true, fallback: true });
        });
    });

    return () => {
      mounted = false;
    };
  }, [config.primary, options.timeout, options.enableSwap]);

  return {
    fontFamily: fontFamilyValue,
    state,
    style: {
      fontFamily: fontFamilyValue,
      fontDisplay: options.enableSwap ? 'swap' : 'auto',
    },
  };
}

/**
 * Utility function to preload fonts
 */
export function preloadFonts(fonts: Array<string | FontFallbackConfig>): Promise<void[]> {
  if (typeof window === 'undefined' || !('FontFace' in window)) {
    return Promise.resolve([]);
  }

  const promises = fonts.map((font) => {
    const config = typeof font === 'string'
      ? FONT_STACKS[font] || { primary: font, fallbacks: [], generic: 'sans-serif' }
      : font;

    const fontFace = new FontFace(config.primary, `local('${config.primary}')`);
    return fontFace.load()
      .then(() => {
        document.fonts.add(fontFace);
      })
      .catch(() => {
        // Silently fail - fallbacks will handle it
      });
  });

  return Promise.all(promises);
}

export default FontFallback;

