/**
 * Design System Standards & Guidelines
 * ===================================
 *
 * Comprehensive standards for building consistent, accessible, and
 * user-centered experiences aligned with Chanuka's brand.
 *
 * This module exports all design standards covering:
 * - Political Neutrality: UI patterns for balanced perspective presentation
 * - Multilingual Support: Typography, localization, i18n patterns
 * - Brand Personality: Voice, tone, and microcopy guidelines
 * - Low-Bandwidth: Performance, offline-first, connectivity adaptation
 */

// Political Neutrality Guidelines
export * from './political-neutrality';
export type { PoliticalNeutralityPrinciples } from './political-neutrality';
export { validatePoliticalNeutrality } from './political-neutrality';

// Multilingual Support Patterns
export * from './multilingual-support';
export type {
  LanguageMetadata,
  SupportedLanguage,
  TextExpansionFactors,
  ResponsiveMultilingualSizing,
  LocalizationFormats,
  MultilingualA11y,
} from './multilingual-support';
export { defaultI18nConfig } from './multilingual-support';

// Brand Personality & Voice Guidelines
export * from './brand-personality';
export type {
  BrandPersonality,
  ToneMatrix,
  VoiceConsistency,
  MicrocopyLibrary,
  AudienceAdaptation,
  BrandVoiceTestingChecklist,
} from './brand-personality';

// Low-Bandwidth & Offline-First Design
export * from './low-bandwidth';
export type {
  LowBandwidthPrinciples,
  BundleSizeTargets,
  HTMLFirstArchitecture,
  ImageOptimization,
  NetworkAdaptation,
  LowBandwidthComponents,
} from './low-bandwidth';
export { defaultLowBandwidthConfig, shouldUseLowBandwidthMode } from './low-bandwidth';

/**
 * Design Standards Overview
 * Exported for reference and documentation
 */
export const DESIGN_STANDARDS_MODULES = [
  {
    name: 'Political Neutrality',
    file: 'political-neutrality.ts',
    purpose: 'UI patterns for balanced perspective presentation',
    guidance: 'Ensures no inherent bias in legislation comparison and analysis',
  },
  {
    name: 'Multilingual Support',
    file: 'multilingual-support.ts',
    purpose: 'Localization, typography, and i18n patterns',
    guidance: 'Supporting English, Swahili, and future languages with proper typography scaling',
  },
  {
    name: 'Brand Personality',
    file: 'brand-personality.ts',
    purpose: 'Voice, tone, and microcopy guidelines',
    guidance: '"Knowledgeable Friend" archetype with transparent, optimistic, pragmatic traits',
  },
  {
    name: 'Low-Bandwidth',
    file: 'low-bandwidth.ts',
    purpose: 'Performance, offline-first, connectivity adaptation',
    guidance: 'Supporting users on basic devices with limited infrastructure',
  },
];

/**
 * Implementation Checklist
 * Track adoption of design standards across the codebase
 */
export 
/**
 * Standards Integration Guide
 * How to use each standard in component development
 */
export 
/**
 * Quick Reference: Standards by Use Case
 */
export 