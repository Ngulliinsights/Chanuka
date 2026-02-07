/**
 * Internationalization Utilities
 * Provides i18n helper functions
 */

export const i18nUtils = {
  getCurrentLocale: () => 'en',
  setLocale: (locale: string) => {
    console.log('Setting locale:', locale);
  },
  translate: (key: string) => key,
};

export default i18nUtils;


export const languages = ['en', 'es', 'fr', 'de'];
export const detectLanguage = () => 'en';
export const saveLanguagePreference = (lang: string) => {
  localStorage.setItem('language', lang);
};


export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de';

export const getKenyanContext = () => ({
  locale: 'en-KE',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
});
