/**
 * Shared design system type declarations
 */

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  fonts: {
    sans: string[];
    mono: string[];
  };
  spacing: Record<string, string>;
  breakpoints: Record<string, string>;
}

export interface DesignToken {
  name: string;
  value: string | number;
  category: 'color' | 'spacing' | 'typography' | 'shadow' | 'border';
  description?: string;
}

export interface ComponentVariant {
  name: string;
  props: Record<string, any>;
  styles: Record<string, any>;
}
