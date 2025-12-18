/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';

import { en } from '@client/utils/i18n';

type Translations = typeof en;

interface I18nContextType {
  t: (key: string, values?: Record<string, unknown>) => string;
  changeLanguage: (lang: string) => void;
  language: string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState<Translations>(en);

  // Could load other languages dynamically here in a real implementation
  useEffect(() => {
    if (language === 'en') {
      setTranslations(en);
    }
  }, [language]);

  const t = useCallback((key: string, values?: Record<string, unknown>): string => {
    const keys = key.split('.');

    let value: unknown = translations as unknown;
    for (const k of keys) {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, k)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (values) {
      return Object.entries(values).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }, value as string);
    }

    return value as string;
  }, [translations]);

  const changeLanguage = useCallback((lang: string) => {
    setLanguage(lang);
  }, []);

  const contextValue = useMemo(() => ({
    t,
    changeLanguage,
    language
  }), [t, changeLanguage, language]);

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