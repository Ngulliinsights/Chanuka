 
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import {
  languages,
  detectLanguage,
  saveLanguagePreference,
  getKenyanContext,
  type SupportedLanguage,
} from '@client/lib/utils/i18n';

/**
 * Translation object type that accepts both English and Swahili
 */
type TranslationObject = typeof languages.en | typeof languages.sw;

/**
 * I18n context interface
 */
interface I18nContextType {
  t: (key: string, values?: Record<string, unknown>) => string;
  changeLanguage: (lang: SupportedLanguage) => void;
  language: SupportedLanguage;
  availableLanguages: readonly SupportedLanguage[];
  kenyanContext: ReturnType<typeof getKenyanContext>;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * I18n Provider Component
 * Manages language state and provides translation utilities
 */
export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(() => detectLanguage());
  const [translations, setTranslations] = useState<TranslationObject>(() =>
    languages[detectLanguage()]
  );

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = () => {
      try {
        const newTranslations = languages[language];
        setTranslations(newTranslations);

        // Update document language and direction
        document.documentElement.lang = language;
        document.documentElement.dir = 'ltr'; // Future: support RTL if needed

        // Save preference to localStorage
        saveLanguagePreference(language);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        // Fallback to English on error
        setTranslations(languages.en);
      }
    };

    loadTranslations();
  }, [language]);

  /**
   * Translation function with interpolation support
   * @param key - Dot-notation key (e.g., 'common.loading')
   * @param values - Optional values for interpolation (e.g., {name: 'John'})
   * @returns Translated string
   */
  const t = useCallback(
    (key: string, values?: Record<string, unknown>): string => {
      const keys = key.split('.');

      // Navigate through the translation object
      let value: unknown = translations;
      for (const k of keys) {
        if (
          value &&
          typeof value === 'object' &&
          Object.prototype.hasOwnProperty.call(value, k)
        ) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Fallback to English if key not found in current language
          let fallbackValue: unknown = languages.en;
          for (const fallbackKey of keys) {
            if (
              fallbackValue &&
              typeof fallbackValue === 'object' &&
              Object.prototype.hasOwnProperty.call(fallbackValue, fallbackKey)
            ) {
              fallbackValue = (fallbackValue as Record<string, unknown>)[fallbackKey];
            } else {
              // Only log each missing key once per session to avoid flooding
              if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
                const warnedKeysKey = '__i18n_warned_keys__';
                const warnedKeys = (window as any)[warnedKeysKey] || new Set();
                if (!warnedKeys.has(key)) {
                  warnedKeys.add(key);
                  (window as any)[warnedKeysKey] = warnedKeys;
                  console.debug(`[i18n] Missing translation key: ${key}`);
                }
              }
              return key;
            }
          }
          value = fallbackValue;
          break;
        }
      }

      // Ensure we have a string value
      if (typeof value !== 'string') {
        console.warn(`Translation value is not a string for key: ${key}`);
        return key;
      }

      // Interpolate values if provided
      if (values) {
        return Object.entries(values).reduce((acc, [k, v]) => {
          return acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }, value);
      }

      return value;
    },
    [translations]
  );

  /**
   * Change the active language
   */
  const changeLanguage = useCallback((lang: SupportedLanguage) => {
    if (lang in languages) {
      setLanguage(lang);
    } else {
      console.warn(`Unsupported language: ${lang}`);
    }
  }, []);

  /**
   * Kenyan localization context
   */
  const kenyanContext = useMemo(() => getKenyanContext(), []);

  /**
   * List of available languages
   */
  const availableLanguages = useMemo(
    () => Object.keys(languages) as SupportedLanguage[],
    []
  );

  /**
   * Check if current language is RTL
   * Currently returns false, but can be extended for Arabic support
   */
  const isRTL = useMemo(() => false, []);

  /**
   * Memoized context value
   */
  const contextValue = useMemo(
    () => ({
      t,
      changeLanguage,
      language,
      availableLanguages,
      kenyanContext,
      isRTL,
    }),
    [t, changeLanguage, language, availableLanguages, kenyanContext, isRTL]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

/**
 * Hook to access i18n context
 * @throws Error if used outside I18nProvider
 */
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

/**
 * Type-safe translation key helper
 * Use this to get autocomplete for translation keys
 */
export type TranslationKey =
  | `common.${keyof typeof languages.en.common}`
  | `navigation.${keyof typeof languages.en.navigation}`
  | `errors.${keyof typeof languages.en.errors}`
  | `auth.${keyof typeof languages.en.auth}`
  | `bills.${keyof typeof languages.en.bills}`
  | `dashboard.${keyof typeof languages.en.dashboard}`
  | `analysis.${keyof typeof languages.en.analysis}`
  | `settings.${keyof typeof languages.en.settings}`
  | `validation.${keyof typeof languages.en.validation}`
  | `dates.${keyof typeof languages.en.dates}`;

/**
 * Example usage:
 *
 * const MyComponent = () => {
 *   const { t, language, changeLanguage } = useI18n();
 *
 *   return (
 *     <div>
 *       <h1>{t('common.loading')}</h1>
 *       <p>{t('dashboard.welcome', { name: 'John' })}</p>
 *       <button onClick={() => changeLanguage('sw')}>
 *         Switch to Swahili
 *       </button>
 *     </div>
 *   );
 * };
 */
