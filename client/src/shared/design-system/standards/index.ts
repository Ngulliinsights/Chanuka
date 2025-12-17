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
export {
  defaultLowBandwidthConfig,
  shouldUseLowBandwidthMode,
} from './low-bandwidth';

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
export const IMPLEMENTATION_CHECKLIST = {
  politicalNeutrality: {
    status: 'ready-for-implementation',
    components: [
      'BillComparison - Use side-by-side layout pattern',
      'PerspectiveCard - Apply governance colors',
      'AmendmentAnalysis - Use neutral language patterns',
      'VoteCounter - Show balanced perspective visualization',
    ],
  },

  multilingualSupport: {
    status: 'ready-for-implementation',
    components: [
      'Typography system - Apply responsive sizing by language',
      'Form labels - Use translatable key patterns',
      'Error messages - Localize with proper formatting',
      'Navigation - Support language switcher',
    ],
  },

  brandPersonality: {
    status: 'ready-for-implementation',
    components: [
      'All buttons - Apply CTA language from MicrocopyLibrary',
      'Error states - Use neutral, solution-focused messages',
      'Empty states - Apply encouraging tone',
      'Help text - Use educational, patient voice',
    ],
  },

  lowBandwidth: {
    status: 'ready-for-implementation',
    components: [
      'Image components - Implement lazy loading and WebP',
      'Bill list - Use pagination instead of infinite scroll',
      'Forms - Progressive enhancement with HTML-first',
      'Service worker - Cache essential bill data offline',
    ],
  },
};

/**
 * Standards Integration Guide
 * How to use each standard in component development
 */
export const STANDARDS_INTEGRATION_GUIDE = {
  forComponentDevelopers: {
    beforeCoding: [
      '1. Review DESIGN_STANDARDS_MODULES above',
      '2. Identify which standards apply to your component',
      '3. Reference specific patterns in the standard files',
    ],

    duringCoding: [
      '1. Use PoliticalNeutralityPrinciples if displaying perspectives',
      '2. Apply MultilingualTypographyScale to text sizing',
      '3. Use MicrocopyLibrary for all user-facing text',
      '4. Test in low-bandwidth mode (DevTools throttling)',
    ],

    testing: [
      '1. Run testingChecklist from relevant standard',
      '2. Color blindness testing (all perspectives)',
      '3. Screen reader testing (all languages)',
      '4. Network throttling testing (Slow 3G)',
    ],
  },

  forDesignReviews: [
    'Check political neutrality (no bias in layout, color, language)',
    'Verify multilingual support (text expansion, fonts, localization)',
    'Audit brand voice (tone, microcopy from library)',
    'Performance check (bundle size, image optimization)',
  ],

  forAccessibility: [
    'PoliticalNeutrality.a11yConsiderations',
    'MultilingualA11y patterns (lang attributes, screen reader)',
    'BrandVoiceTestingChecklist items',
    'LowBandwidthTestingChecklist a11y items',
  ],
};

/**
 * Quick Reference: Standards by Use Case
 */
export const STANDARDS_BY_USE_CASE = {
  'Bill Comparison View': [
    '→ PoliticalNeutrality.layoutPatterns.sideBySideComparison',
    '→ BrandPersonality.ToneMatrix.complexity',
    '→ MultilingualSupport.MultilingualTestingChecklist',
  ],

  'Form with International Users': [
    '→ MultilingualSupport.ResponsiveMultilingualSizing',
    '→ MultilingualSupport.MultilingualA11y',
    '→ BrandPersonality.MicrocopyLibrary.formLabels',
  ],

  'Error or Empty State': [
    '→ BrandPersonality.ToneMatrix.error or .empty',
    '→ BrandPersonality.MicrocopyLibrary.errors or .emptyStates',
    '→ LowBandwidth.LoadingStates (skeleton screens)',
  ],

  'Performance Critical (Slow Connection)': [
    '→ LowBandwidth.BundleSizeTargets',
    '→ LowBandwidth.ImageOptimization',
    '→ LowBandwidth.HTMLFirstArchitecture',
  ],

  'Multiple Perspectives Display': [
    '→ PoliticalNeutrality.layoutPatterns',
    '→ PoliticalNeutrality.visualIndicators',
    '→ PoliticalNeutrality.testingChecklist',
  ],

  'Global/Multilingual App': [
    '→ MultilingualSupport.LanguageDetectionStrategy',
    '→ MultilingualSupport.LocalizationFormats',
    '→ MultilingualSupport.PluralRules',
  ],
};
