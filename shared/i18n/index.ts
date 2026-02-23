/**
 * Internationalization Module
 * 
 * Provides multi-language support for the Chanuka platform
 */

// Import language files
import en from './en';
import sw from './sw';

// Language registry
export const languages = {
  en,
  sw,
} as const;

export type SupportedLanguage = keyof typeof languages;
export type TranslationKey = keyof typeof en;

// Translation function type
export type TranslationFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

// Create translation function for a specific language
export const createTranslator = (language: SupportedLanguage): TranslationFunction => {
  const translations = languages[language];
  
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    let translation = translations[key] || key;
    
    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });
    }
    
    return translation;
  };
};

// Default translator (English)
export const t = createTranslator('en');

// Language detection utilities
export const detectLanguage = (): SupportedLanguage => {
  // Browser language detection
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (browserLang in languages) {
      return browserLang;
    }
  }
  
  // Default to English
  return 'en';
};

// Export language data
export { en, sw };
export default { languages, createTranslator, t, detectLanguage };