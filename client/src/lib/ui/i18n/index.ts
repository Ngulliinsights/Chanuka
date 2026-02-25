/**
 * Internationalization UI Components
 *
 * Components for language switching and localization support
 * with Kenyan cultural context adaptation
 *
 * Requirements: 10.1, 10.2, 10.3
 */

// Language Switcher Components
import {
  LanguageSwitcher,
  LanguageToggle,
  LanguageStatus,
  default as LanguageSwitcherDefault,
} from './LanguageSwitcher';

export {
  LanguageSwitcher,
  LanguageToggle,
  LanguageStatus,
  LanguageSwitcherDefault,
};

// Re-export i18n hook for convenience
export { useI18n } from '@client/lib/hooks/use-i18n';

// Re-export Kenyan context hook
export { useKenyanContext } from '@client/lib/contexts/KenyanContextProvider';

// Types
export type { SupportedLanguage } from '@client/lib/utils/i18n';

/**
 * Utility function to get language display name
 */
export const getLanguageDisplayName = (language: string, inLanguage?: string): string => {
  const displayNames: Record<string, Record<string, string>> = {
    en: {
      en: 'English',
      sw: 'Swahili',
    },
    sw: {
      en: 'Kiingereza',
      sw: 'Kiswahili',
    },
  };

  return displayNames[inLanguage || 'en']?.[language] || language;
};

/**
 * Utility function to get language flag emoji
 */
export const getLanguageFlag = (language: string): string => {
  const flags: Record<string, string> = {
    en: '🇬🇧',
    sw: '🇰🇪',
  };

  return flags[language] || '🌐';
};

/**
 * Utility function to check if language is RTL
 */
export const isRTLLanguage = (language: string): boolean => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(language);
};

const i18nComponents = {
  LanguageSwitcher,
  LanguageToggle,
  LanguageStatus,
  getLanguageDisplayName,
  getLanguageFlag,
  isRTLLanguage,
};

export default i18nComponents;
