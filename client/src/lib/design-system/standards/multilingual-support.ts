/**
 * Multilingual Support Guidelines
 * ===============================
 *
 * Supporting English, Swahili, and patterns for additional languages.
 * Per roadmap: "Multilingual applications (English, Swahili, potentially other local languages)"
 */

export type SupportedLanguage = 'en' | 'sw';

export const LanguageMetadata: Record<
  SupportedLanguage,
  {
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
    locale: string;
    region: string[];
  }
> = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    locale: 'en-US',
    region: ['US', 'UK', 'CA', 'AU'],
  },
  sw: {
    name: 'Swahili',
    nativeName: 'Kiswahili',
    direction: 'ltr',
    locale: 'sw-KE',
    region: ['KE', 'TZ', 'UG', 'DZ'],
  },
};

/**
 * Text Expansion Factors
 * Different languages require different amounts of space
 */
export /**
 * Component Size Adjustments for Text Expansion
 * Prevents UI breaking when content expands
 */
const /**
   * Typography Scale - Responsive to Language Expansion
   */
  /**
   * Font Recommendations by Language
   */
  FontSelectionByLanguage: Record<
    SupportedLanguage,
    {
      primary: string[];
      fallback: string[];
      features: string[];
      cssVars: string;
    }
  > = {
    en: {
      primary: ['Inter', 'system-ui', 'sans-serif'],
      fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI'],
      features: ['ss01', 'ss02'], // Stylistic sets if available
      cssVars: `
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-family: var(--font-sans);
      font-feature-settings: 'ss01' 1, 'ss02' 1;
    `,
    },

    sw: {
      primary: ['Inter', 'Noto Sans', 'system-ui', 'sans-serif'],
      fallback: ['-apple-system', 'BlinkMacSystemFont'],
      features: ['ss02'], // Slightly different spacing preference
      cssVars: `
      --font-sans: 'Inter', 'Noto Sans', system-ui, sans-serif;
      --font-family: var(--font-sans);
      font-feature-settings: 'ss02' 1;
      letter-spacing: 0.3px;
    `,
    },
  };

/**
 * Number, Date, and Currency Formatting
 */
export /**
 * Pluralization Rules
 * Different languages have different plural forms
 */
interface /**
 * Component Adaptation for RTL Languages
 * (For future: Arabic, Hebrew, Persian, etc.)
 */
/**
 * Translation Key Naming Convention
 * Consistent pattern for i18n library
 */
/**
 * Common UI String Patterns
 * Templated strings for translation
 */
/**
 * Microcopy Localization Guidelines
 */
/**
 * Accessibility Considerations for Multilingual Content
 */
/**
 * Language Detection and Fallback Strategy
 */
/**
 * Translation Resource Structure
 * Recommended i18n JSON organization
 */
/**
 * Testing Checklist for Multilingual Support
 */
/**
 * Implementation Hook for i18n Integration
 */
I18nConfig {
  supportedLanguages: SupportedLanguage[];
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  enableLanguageSwitcher: boolean;
  persistLanguagePreference: boolean;
  textExpansionPadding: boolean;
}

export const defaultI18nConfig: I18nConfig = {
  supportedLanguages: ['en', 'sw'],
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  enableLanguageSwitcher: true,
  persistLanguagePreference: true,
  textExpansionPadding: true,
};
