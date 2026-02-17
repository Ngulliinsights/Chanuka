/**
 * Contrast Utilities
 * WCAG-compliant contrast calculation and validation
 */

// WCAG contrast ratio thresholds
export const CONTRAST_THRESHOLDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

export type ContrastLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large';

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex colors like #ffffff');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: ContrastLevel = 'AA',
  textSize: TextSize = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);

  const threshold =
    level === 'AAA'
      ? textSize === 'large'
        ? CONTRAST_THRESHOLDS.AAA_LARGE
        : CONTRAST_THRESHOLDS.AAA_NORMAL
      : textSize === 'large'
        ? CONTRAST_THRESHOLDS.AA_LARGE
        : CONTRAST_THRESHOLDS.AA_NORMAL;

  return ratio >= threshold;
}

/**
 * Get contrast level achieved by color combination
 */
export function getContrastLevel(
  foreground: string,
  background: string,
  textSize: TextSize = 'normal'
): 'AAA' | 'AA' | 'FAIL' {
  const ratio = getContrastRatio(foreground, background);

  const aaaThreshold =
    textSize === 'large' ? CONTRAST_THRESHOLDS.AAA_LARGE : CONTRAST_THRESHOLDS.AAA_NORMAL;
  const aaThreshold =
    textSize === 'large' ? CONTRAST_THRESHOLDS.AA_LARGE : CONTRAST_THRESHOLDS.AA_NORMAL;

  if (ratio >= aaaThreshold) return 'AAA';
  if (ratio >= aaThreshold) return 'AA';
  return 'FAIL';
}

/**
 * Generate accessible color variations
 */
export function generateAccessibleColors(
  baseColor: string,
  background: string = '#ffffff'
): {
  aa: string;
  aaa: string;
  original: string;
  contrastRatios: {
    original: number;
    aa: number;
    aaa: number;
  };
} {
  const originalRatio = getContrastRatio(baseColor, background);

  // If already meets AAA, return as-is
  if (originalRatio >= CONTRAST_THRESHOLDS.AAA_NORMAL) {
    return {
      aa: baseColor,
      aaa: baseColor,
      original: baseColor,
      contrastRatios: {
        original: originalRatio,
        aa: originalRatio,
        aaa: originalRatio,
      },
    };
  }

  const rgb = hexToRgb(baseColor);
  if (!rgb) throw new Error('Invalid base color');

  // Darken or lighten to meet requirements
  const isLightBackground = getLuminance(255, 255, 255) > 0.5;

  let aaColor = baseColor;
  let aaaColor = baseColor;

  // Adjust color to meet AA standard
  for (let adjustment = 0; adjustment <= 100; adjustment += 5) {
    const factor = isLightBackground ? (100 - adjustment) / 100 : (100 + adjustment) / 100;
    const adjustedR = Math.round(rgb.r * factor);
    const adjustedG = Math.round(rgb.g * factor);
    const adjustedB = Math.round(rgb.b * factor);

    const adjustedColor = `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
    const ratio = getContrastRatio(adjustedColor, background);

    if (ratio >= CONTRAST_THRESHOLDS.AA_NORMAL && aaColor === baseColor) {
      aaColor = adjustedColor;
    }

    if (ratio >= CONTRAST_THRESHOLDS.AAA_NORMAL) {
      aaaColor = adjustedColor;
      break;
    }
  }

  return {
    aa: aaColor,
    aaa: aaaColor,
    original: baseColor,
    contrastRatios: {
      original: originalRatio,
      aa: getContrastRatio(aaColor, background),
      aaa: getContrastRatio(aaaColor, background),
    },
  };
}

/**
 * Validate theme colors for accessibility
 */
export function validateThemeContrast(theme: Record<string, unknown>): {
  isValid: boolean;
  issues: Array<{
    property: string;
    foreground: string;
    background: string;
    ratio: number;
    required: number;
    level: 'AA' | 'AAA' | 'FAIL';
  }>;
} {
  const issues: Array<{
    property: string;
    foreground: string;
    background: string;
    ratio: number;
    required: number;
    level: 'AA' | 'AAA' | 'FAIL';
  }> = [];

  // Common color combinations to check
  const combinations = [
    { fg: 'foreground', bg: 'background', name: 'text-on-background' },
    { fg: 'primaryForeground', bg: 'primary', name: 'primary-button-text' },
    { fg: 'secondaryForeground', bg: 'secondary', name: 'secondary-button-text' },
    { fg: 'accentForeground', bg: 'accent', name: 'accent-button-text' },
    { fg: 'mutedForeground', bg: 'muted', name: 'muted-text' },
    { fg: 'cardForeground', bg: 'card', name: 'card-text' },
    { fg: 'errorForeground', bg: 'error', name: 'error-text' },
    { fg: 'successForeground', bg: 'success', name: 'success-text' },
    { fg: 'warningForeground', bg: 'warning', name: 'warning-text' },
  ];

  combinations.forEach(({ fg, bg, name }) => {
    if (theme.colors?.[fg] && theme.colors?.[bg]) {
      const ratio = getContrastRatio(theme.colors[fg], theme.colors[bg]);
      const level = getContrastLevel(theme.colors[fg], theme.colors[bg]);

      if (level === 'FAIL') {
        issues.push({
          property: name,
          foreground: theme.colors[fg],
          background: theme.colors[bg],
          ratio,
          required: CONTRAST_THRESHOLDS.AA_NORMAL,
          level,
        });
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * CSS custom properties for dynamic contrast
 */
export function generateContrastCSS(theme: unknown): string {
  return `
    /* Dynamic contrast utilities */
    .contrast-aa {
      --contrast-level: 'AA';
    }
    
    .contrast-aaa {
      --contrast-level: 'AAA';
    }
    
    /* High contrast mode overrides */
    @media (prefers-contrast: high) {
      :root {
        --primary: ${theme.cssVariables?.['--primary'] || '0 0% 0%'};
        --background: ${theme.cssVariables?.['--background'] || '0 0% 100%'};
        --foreground: ${theme.cssVariables?.['--foreground'] || '0 0% 0%'};
        --border: 0 0% 0%;
        --ring: 25 100% 50%;
      }
      
      .dark {
        --primary: 0 0% 100%;
        --background: 0 0% 0%;
        --foreground: 0 0% 100%;
        --border: 0 0% 100%;
      }
      
      /* Enhanced focus indicators */
      *:focus-visible {
        outline: 3px solid hsl(var(--ring));
        outline-offset: 2px;
      }
      
      /* Enhanced borders */
      .chanuka-card,
      .chanuka-btn,
      .chanuka-input {
        border-width: 2px;
      }
    }
  `;
}
