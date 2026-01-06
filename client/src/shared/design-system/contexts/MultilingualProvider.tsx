/* eslint-disable react-refresh/only-export-components */

/**
 * Multilingual Provider
 * ===================
 *
 * Context provider for multilingual support (English, Swahili, and future languages).
 * Handles language detection, switching, and localization patterns.
 *
 * Usage:
 *   <MultilingualProvider defaultLanguage="en">
 *     <App />
 *   </MultilingualProvider>
 *
 *   // In components:
 *   const { language, setLanguage, format } = useLanguage();
 *   const formatted = format.number(1234); // "1,234" or "1234" depending on locale
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import {
  SupportedLanguage,
  LanguageMetadata,
  LocalizationFormats,
  PluralRules,
} from '../standards/multilingual-support';

interface MultilingualContextType {
  /**
   * Currently selected language
   */
  language: SupportedLanguage;

  /**
   * Set language
   */
  setLanguage: (lang: SupportedLanguage) => void;

  /**
   * Metadata for current language
   */
  metadata: (typeof LanguageMetadata)[SupportedLanguage];

  /**
   * Formatting functions for current language
   */
  format: (typeof LocalizationFormats)[SupportedLanguage];

  /**
   * Pluralization rule for current language
   */
  pluralize: (count: number) => 'one' | 'other';

  /**
   * Get localized text direction (ltr/rtl)
   */
  direction: 'ltr' | 'rtl';

  /**
   * All supported languages
   */
  supportedLanguages: SupportedLanguage[];

  /**
   * Detect browser language preference
   */
  detectBrowserLanguage: () => SupportedLanguage;
}

const MultilingualContext = createContext<MultilingualContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'userLanguagePreference';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'sw'];

/**
 * Detect browser language or get from URL/storage
 */
function detectLanguage(): SupportedLanguage {
  // Priority 1: URL parameter
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang') as SupportedLanguage | null;
    if (urlLang && SUPPORTED_LANGUAGES.includes(urlLang)) {
      return urlLang;
    }

    // Priority 2: User preference (localStorage)
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }

    // Priority 3: Browser language
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    if (browserLang === 'sw') return 'sw';
  }

  // Priority 4: Default
  return 'en';
}

/**
 * Multilingual Provider Component
 */
export function MultilingualProvider({
  children,
  defaultLanguage = 'en',
}: {
  children: ReactNode;
  defaultLanguage?: SupportedLanguage;
}) {
  const [language, setLanguageState] = useState<SupportedLanguage>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  // Detect language on mount
  useEffect(() => {
    const detected = detectLanguage();
    if (detected !== language) {
      setLanguageState(detected);
    }
    setMounted(true);
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Update html lang attribute
      document.documentElement.lang = lang;
    }
  };

  const contextValue: MultilingualContextType = {
    language,
    setLanguage,
    metadata: LanguageMetadata[language],
    format: LocalizationFormats[language],
    pluralize: (count: number) => PluralRules[language].rule(count),
    direction: LanguageMetadata[language].direction,
    supportedLanguages: SUPPORTED_LANGUAGES,
    detectBrowserLanguage: detectLanguage,
  };

  // Ensure html element has correct lang attribute
  if (mounted && typeof window !== 'undefined') {
    document.documentElement.lang = language;
    document.documentElement.dir = contextValue.direction;
  }

  return (
    <MultilingualContext.Provider value={contextValue}>{children}</MultilingualContext.Provider>
  );
}

/**
 * Hook to access multilingual context
 */
export function useLanguage(): MultilingualContextType {
  const context = useContext(MultilingualContext);
  if (!context) {
    throw new Error('useLanguage must be used within MultilingualProvider');
  }
  return context;
}

/**
 * Component for language switcher
 */
export interface LanguageSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Show full language names
   */
  showFullName?: boolean;
}

/**
 * Language switcher component
 */
export function LanguageSwitcher({
  showFullName = false,
  className,
  ...props
}: LanguageSwitcherProps) {
  const { language, setLanguage, supportedLanguages } = useLanguage();

  return (
    <div className={className} {...props}>
      {supportedLanguages.map(lang => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          aria-current={language === lang ? 'true' : 'false'}
          title={LanguageMetadata[lang].nativeName}
        >
          {showFullName ? LanguageMetadata[lang].nativeName : lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/**
 * Formatted number component using locale
 */
export interface FormattedNumberProps {
  value: number;
  className?: string;
}

export function FormattedNumber({ value, className }: FormattedNumberProps) {
  const { format } = useLanguage();
  return <span className={className}>{format.number(value)}</span>;
}

/**
 * Formatted currency component using locale
 */
export interface FormattedCurrencyProps {
  value: number;
  currency?: string;
  className?: string;
}

export function FormattedCurrency({ value, currency = 'USD', className }: FormattedCurrencyProps) {
  const { format } = useLanguage();
  return <span className={className}>{format.currency(value, currency)}</span>;
}

/**
 * Formatted date component using locale
 */
export interface FormattedDateProps {
  date: Date;
  className?: string;
}

export function FormattedDate({ date, className }: FormattedDateProps) {
  const { format } = useLanguage();
  return <span className={className}>{format.date(date)}</span>;
}
