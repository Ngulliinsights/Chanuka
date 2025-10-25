import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { en } from '@shared/i18n/en';
import { logger } from '../utils/browser-logger';

type Translations = typeof en;

interface I18nContextType {
  t: (key: string, values?: Record<string, any>) => string;
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

  const t = (key: string, values?: Record<string, any>): string => {
    // Split the key by dots to access nested properties
    const keys = key.split('.');
    
    // Traverse the translations object using the keys
    let value: any = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the key if translation not found
        return key;
      }
    }

    // If the value is not a string, return the key
    if (typeof value !== 'string') {
      return key;
    }

    // Replace placeholders with values if provided
    if (values) {
      return Object.entries(values).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }, value);
    }

    return value;
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <I18nContext.Provider value={{ t, changeLanguage, language }}>
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
