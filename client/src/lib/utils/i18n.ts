/**
 * Internationalization Utilities
 * Provides i18n helper functions
 */

// Import from design system for single source of truth
export type { SupportedLanguage } from '../design-system/standards/multilingual-support';

export const i18nUtils = {
  getCurrentLocale: () => 'en',
  setLocale: (locale: string) => {
    console.log('Setting locale:', locale);
  },
  translate: (key: string) => key,
};

export default i18nUtils;

// Stub translations - to be replaced with actual translation files
const enTranslations = {
  common: { loading: 'Loading...', changeLanguage: 'Language changed to {{current}}' },
  navigation: {},
  errors: {},
  auth: {},
  bills: {},
  dashboard: {},
  analysis: {},
  settings: {},
  validation: {},
  dates: {},
};

const swTranslations = {
  common: { loading: 'Inapakia...', changeLanguage: 'Lugha imebadilishwa kuwa {{current}}' },
  navigation: {},
  errors: {},
  auth: {},
  bills: {},
  dashboard: {},
  analysis: {},
  settings: {},
  validation: {},
  dates: {},
};

// Export languages object with translations
export const languages = {
  en: enTranslations,
  sw: swTranslations,
} as const;

export const detectLanguage = () => {
  const saved = localStorage.getItem('language');
  if (saved === 'en' || saved === 'sw') return saved;
  return 'en' as const;
};

export const saveLanguagePreference = (lang: string) => {
  localStorage.setItem('language', lang);
};

export const getKenyanContext = () => ({
  locale: 'en-KE',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
});
