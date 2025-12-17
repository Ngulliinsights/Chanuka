/* eslint-disable react-refresh/only-export-components */

/**
 * Brand Voice Provider
 * ==================
 *
 * Context provider for applying brand voice guidelines across the application.
 * Ensures consistent microcopy, tone, and user-facing text.
 *
 * Usage:
 *   <BrandVoiceProvider>
 *     <App />
 *   </BrandVoiceProvider>
 *
 *   // In components:
 *   const { getMicrocopy, getTone } = useBrandVoice();
 *   const buttonLabel = getMicrocopy('buttons.primary.search');
 */

import React, { createContext, useContext, ReactNode } from 'react';

import {
  MicrocopyLibrary,
  ToneMatrix,
  AudienceAdaptation,
  BrandPersonality,
  EmotionalIntelligence,
} from '../standards/brand-personality';

interface BrandVoiceContextType {
  /**
   * Get microcopy string by path
   * @param path dot-notation path like "buttons.primary.search"
   */
  getMicrocopy: (path: string) => string | undefined;

  /**
   * Get tone guidelines for context
   * @param context "success" | "error" | "educational" | "alert" | "empty" | "complexity"
   */
  getTone: (context: keyof typeof ToneMatrix) => (typeof ToneMatrix)[typeof context];

  /**
   * Get audience-specific guidance
   * @param audience "novice" | "engaged" | "specialist"
   */
  getAudienceGuidance: (
    audience: keyof typeof AudienceAdaptation,
  ) => (typeof AudienceAdaptation)[typeof audience];

  /**
   * Get emotional intelligence pattern
   * @param emotion emotion type
   */
  getEmotionalPattern: (emotion: keyof typeof EmotionalIntelligence) => string;

  /**
   * Brand personality constants
   */
  personality: typeof BrandPersonality;
}

const BrandVoiceContext = createContext<BrandVoiceContextType | undefined>(undefined);

/**
 * Helper to get nested value from object by dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, prop: string) => {
    if (typeof current === 'object' && current !== null) {
      return (current as Record<string, unknown>)[prop];
    }
    return undefined;
  }, obj);
}

/**
 * Brand Voice Provider Component
 */
export function BrandVoiceProvider({ children }: { children: ReactNode }) {
  const contextValue: BrandVoiceContextType = {
    getMicrocopy: (path: string) => {
      const value = getNestedValue(MicrocopyLibrary, path);
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        // For complex objects, return them as-is (caller will access properties)
        return JSON.stringify(value);
      }
      console.warn(`[BrandVoice] Microcopy not found: ${path}`);
      return undefined;
    },

    getTone: (context: keyof typeof ToneMatrix) => {
      const tone = ToneMatrix[context];
      if (!tone) {
        console.warn(`[BrandVoice] Tone not found: ${context}`);
      }
      return tone;
    },

    getAudienceGuidance: (audience: keyof typeof AudienceAdaptation) => {
      const guidance = AudienceAdaptation[audience];
      if (!guidance) {
        console.warn(`[BrandVoice] Audience guidance not found: ${audience}`);
      }
      return guidance;
    },

    getEmotionalPattern: (emotion: keyof typeof EmotionalIntelligence) => {
      const pattern = EmotionalIntelligence[emotion];
      if (!pattern) {
        console.warn(`[BrandVoice] Emotional pattern not found: ${emotion}`);
        return '';
      }
      return pattern.response;
    },

    personality: BrandPersonality,
  };

  return (
    <BrandVoiceContext.Provider value={contextValue}>
      {children}
    </BrandVoiceContext.Provider>
  );
}

/**
 * Hook to access brand voice guidelines
 */
export function useBrandVoice(): BrandVoiceContextType {
  const context = useContext(BrandVoiceContext);
  if (!context) {
    throw new Error('useBrandVoice must be used within BrandVoiceProvider');
  }
  return context;
}

/**
 * Component wrapper for applying brand microcopy to UI elements
 */
export interface BrandTextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Microcopy path (dot notation)
   */
  path: string;
  /**
   * Fallback text if microcopy not found
   */
  fallback?: string;
  /**
   * HTML element to render (span, p, div, etc.)
   */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Component for rendering brand-aware text
 */
export const BrandText = React.forwardRef<HTMLElement, BrandTextProps>(
  ({ path, fallback, as: Component = 'span', className, ...props }, ref) => {
    const { getMicrocopy } = useBrandVoice();
    const text = getMicrocopy(path) || fallback || path;

    return React.createElement(
      Component as React.ElementType,
      {
        ref,
        className,
        ...props,
      },
      text
    );
  },
);

BrandText.displayName = 'BrandText';
