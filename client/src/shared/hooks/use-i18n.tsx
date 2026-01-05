/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';

import { languages, detectLanguage, saveLanguagePreference, getKenyanContext, type SupportedLanguage } from '../../utils/i18n';

type Translations = typeof languages.en;

interface I18nContextType {
  t: (key: string, values?: Record<string, unknown>) => string;
  changeLanguage: (lang: SupportedLanguage) => void;
  language: SupportedLanguage;
  availableLanguages: readonly SupportedLanguage[];
  kenyanContext: ReturnType<typeof getKenyanContext>;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(() => detectLanguage());
  const [translations, setTranslations] = useState<Translations>(() => languages[detectLanguage()]);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const newTranslations = languages[language];
        setTranslations(newTranslations);

        // Update document language and direction
        document.documentElement.lang = language;
        // Future Arabic support - currently no RTL languages supported
        document.documentElement.dir = 'ltr';

        // Save preference
        saveLanguagePreference(language);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        // Fallback to English
        setTranslations(languages.en);
      }
    };

    loadTranslations();
  }, [language]);

  const t = useCallback((key: string, values?: Record<string, unknown>): string => {
    const keys = key.split('.');

    let value: unknown = translations as unknown;
    for (const k of keys) {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, k)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English if key not found
        let fallbackValue: unknown = languages.en as unknown;
        for (const fallbackKey of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && Object.prototype.hasOwnProperty.call(fallbackValue, fallbackKey)) {
            fallbackValue = (fallbackValue as Record<string, unknown>)[fallbackKey];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        value = fallbackValue;
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters in translation
    if (values) {
      return Object.entries(values).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }, value as string);
    }

    return value as string;
  }, [translations]);

  const changeLanguage = useCallback((lang: SupportedLanguage) => {
    if (lang in languages) {
      setLanguage(lang);
    }
  }, []);

  const kenyanContext = useMemo(() => getKenyanContext(), []);

  const availableLanguages = useMemo(() => Object.keys(languages) as SupportedLanguage[], []);

  const isRTL = useMemo(() => {
    // Future support for RTL languages
    return false;
  }, [language]);

  const contextValue = useMemo(() => ({
    t,
    changeLanguage,
    language,
    availableLanguages,
    kenyanContext,
    isRTL,
  }), [t, changeLanguage, language, availableLanguages, kenyanContext, isRTL]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
