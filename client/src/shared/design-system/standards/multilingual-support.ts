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
export const TextExpansionFactors = {
  en: 1.0, // Baseline
  sw: 1.15, // ~15% expansion for Swahili
};

/**
 * Component Size Adjustments for Text Expansion
 * Prevents UI breaking when content expands
 */
export const ResponsiveMultilingualSizing = {
  button: {
    padding: 'px-4 py-2 lg:px-6 lg:py-3', // Extra space for expansion
    minHeight: '44px', // Touch-target minimum (WCAG)
    minWidth: '44px',
  },

  heading: {
    h1: 'text-2xl lg:text-4xl leading-tight', // Loose leading for expansion
    h2: 'text-xl lg:text-3xl leading-tight',
    h3: 'text-lg lg:text-2xl leading-tight',
    p: 'text-base leading-relaxed', // More leading for readability
  },

  form: {
    labelSpacing: 'mb-2 lg:mb-3', // Extra space between form fields
    inputHeight: 'min-h-[2.75rem]', // Touch-friendly
    selectHeight: 'min-h-[2.75rem]',
  },

  menu: {
    itemPadding: 'px-4 py-3 lg:px-6', // Generous padding
    itemHeight: 'min-h-[3rem]',
  },
};

/**
 * Typography Scale - Responsive to Language Expansion
 */
export const MultilingualTypographyScale = {
  xs: 'text-xs leading-4', // 12px
  sm: 'text-sm leading-5', // 14px
  base: 'text-base leading-6', // 16px - body text baseline
  lg: 'text-lg leading-7', // 18px
  xl: 'text-xl leading-8', // 20px
  '2xl': 'text-2xl leading-9', // 24px
  '3xl': 'text-3xl leading-10', // 30px
  '4xl': 'text-4xl leading-tight', // 36px

  // Special scales for multilingual content
  bodyExpanded: 'text-base lg:text-lg leading-relaxed', // Extra leading
  headingTight: 'text-xl lg:text-2xl leading-tight', // Prevent overspill
};

/**
 * Font Recommendations by Language
 */
export const FontSelectionByLanguage: Record<
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
export const LocalizationFormats = {
  en: {
    number: (n: number) => n.toLocaleString('en-US'),
    currency: (amount: number, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
    date: (date: Date) => new Intl.DateTimeFormat('en-US').format(date),
    time: (date: Date) => new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(date),
  },

  sw: {
    number: (n: number) => n.toLocaleString('sw-KE'),
    currency: (amount: number, currency = 'KES') =>
      new Intl.NumberFormat('sw-KE', { style: 'currency', currency }).format(amount),
    date: (date: Date) => new Intl.DateTimeFormat('sw-KE').format(date),
    time: (date: Date) => new Intl.DateTimeFormat('sw-KE', { timeStyle: 'short' }).format(date),
  },
};

/**
 * Pluralization Rules
 * Different languages have different plural forms
 */
export const PluralRules = {
  en: {
    forms: ['one', 'other'],
    rule: (n: number) => (n === 1 ? 'one' : 'other'),
    examples: {
      one: '1 bill',
      other: 'X bills',
    },
  },

  sw: {
    forms: ['one', 'other'],
    rule: (n: number) => (n === 1 ? 'one' : 'other'),
    examples: {
      one: 'muswada 1',
      other: 'miswada X',
    },
  },
};

/**
 * Component Adaptation for RTL Languages
 * (For future: Arabic, Hebrew, Persian, etc.)
 */
export const RTLComponentAdaptation = {
  flexDirection: {
    // Components using flex-row need reversal for RTL
    ltr: 'flex-row',
    rtl: 'flex-row-reverse',
  },

  textAlign: {
    ltr: 'text-left',
    rtl: 'text-right',
  },

  marginDirection: {
    // ml/mr → mr/ml for RTL
    ltr: { ml: 'ml', mr: 'mr', pl: 'pl', pr: 'pr' },
    rtl: { ml: 'mr', mr: 'ml', pl: 'pr', pr: 'pl' },
  },

  transformOrigin: {
    // Transform origins need reversal
    ltr: 'origin-right',
    rtl: 'origin-left',
  },
};

/**
 * Translation Key Naming Convention
 * Consistent pattern for i18n library
 */
export const TranslationKeyPattern = {
  structure: 'namespace.section.key',
  examples: {
    uiButton: 'ui.button.submit',
    uiError: 'ui.error.network',
    pageHeader: 'page.legislature.title',
    formLabel: 'form.bill.labelNumber',
  },

  conventions: {
    DO: [
      'Use hierarchical dots for namespacing',
      'Keep keys lowercase with dots/underscores',
      'Descriptive but concise (3-4 levels max)',
      'Group related keys together',
      'Use .label, .placeholder, .error suffixes consistently',
    ],
    DON_T: [
      'Use camelCase or PascalCase',
      'Mix separators (dots vs underscores)',
      'Deep nesting (>4 levels)',
      'Generic keys like "button1", "text2"',
      'Language-specific keys',
    ],
  },
};

/**
 * Common UI String Patterns
 * Templated strings for translation
 */
export const UIStringPatterns = {
  // Interpolation pattern: {{variable}}
  statusMessage: 'ui.status.message', // "{{count}} items selected"
  confirmation: 'ui.dialog.confirm', // "Are you sure you want to {{action}}?"
  error: 'ui.error.generic', // "An error occurred: {{code}}"
  form: 'ui.form.required', // "{{fieldName}} is required"

  // Plural handling
  itemCount: 'ui.list.itemCount', // "1 bill" vs "5 bills"
  resultCount: 'ui.search.resultCount', // "1 result found" vs "42 results found"
};

/**
 * Microcopy Localization Guidelines
 */
export const MicrocopyLocalization = {
  buttonLabels: {
    en: {
      submit: 'Submit',
      cancel: 'Cancel',
      delete: 'Delete',
      save: 'Save Changes',
      learn_more: 'Learn More',
    },
    sw: {
      submit: 'Tuma',
      cancel: 'Ghairi',
      delete: 'Futa',
      save: 'Hifadhi Mabadiliko',
      learn_more: 'Jifunze Zaidi',
    },
  },

  helpText: {
    placeholder: 'Contextual guidance for form fields',
    tooltip: 'Brief explanation for UI element',
    errorMessage: 'Specific, actionable error description',
    emptyState: 'Encouraging message when no content',
  },

  toneGuidelines: {
    'Knowledgeable Friend': {
      principle: 'Warm, helpful, informed tone',
      en_example: "That bill couldn't be found. Did you mean...?",
      sw_example: 'Muswada huo hauwezi kupatikana. Je, unakusudiia...?',
    },

    optimistic: {
      principle: 'Encourage participation',
      en_example: 'Ready to explore the legislative process?',
      sw_example: 'Jina haba na kuku?', // Swahili idiom
    },

    pragmatic: {
      principle: 'Direct, factual language',
      en_example: 'Filter bills by date range to narrow results',
      sw_example: 'Sanya muswada kwa sehemu ya tarehe ili kupunguza matokeo',
    },
  },
};

/**
 * Accessibility Considerations for Multilingual Content
 */
export const MultilingualA11y = {
  htmlLang: {
    purpose: 'Inform assistive technologies of content language',
    usage: '<html lang="en"> or <html lang="sw">',
    switchElement: '<div lang="sw">{content}</div>',
  },

  screenReaderBehavior: {
    numberPronunciation: {
      en: '1,234.56 reads as "one thousand, two hundred thirty-four point five six"',
      sw: '1,234.56 reads as "elfu moja, mia mbili thelathini na nne kumoja sitini na sita aelfu"',
    },

    abbreviations: {
      guidance: 'Spell out abbreviations or provide <abbr> title',
      example: '<abbr title="United States Dollar">USD</abbr>',
    },

    dateFormat: {
      guidance: 'Ensure screen readers announce dates correctly',
      en: 'January 15, 2024',
      sw: '15 Januari 2024',
    },
  },

  contrastByLanguage: {
    // Different scripts may have different contrast needs
    guideline: 'Maintain WCAG AA 4.5:1 for all languages',
    note: 'Some scripts may benefit from higher contrast',
  },

  focusIndicators: {
    requirement: 'Must be visible and clear across all language contexts',
    note: 'Icons/colors used in focus states must work with all languages',
  },
};

/**
 * Language Detection and Fallback Strategy
 */
export const LanguageDetectionStrategy = {
  priority: [
    '1. URL parameter: ?lang=sw or ?lang=en',
    '2. User settings (authenticated users)',
    '3. Browser language (navigator.language)',
    '4. Geographic location (if available)',
    '5. Manual selection in UI',
    '6. Default: English',
  ],

  implementation: {
    storageKey: 'userLanguagePreference',
    persist: true,
    expiry: 'Never (until manually changed)',
  },

  fallback: {
    strategy: 'If translation missing, show English',
    warning: 'Log missing translations for translation team',
    userNotice: 'Subtle indicator if content in fallback language',
  },
};

/**
 * Translation Resource Structure
 * Recommended i18n JSON organization
 */
export const TranslationStructureExample = {
  en: {
    ui: {
      button: {
        submit: 'Submit',
        cancel: 'Cancel',
      },
      error: {
        network: 'Network connection failed',
        notFound: 'Page not found',
      },
    },
    page: {
      legislature: {
        title: 'National Assembly',
        description: 'View and analyze bills',
      },
    },
    form: {
      bill: {
        labelNumber: 'Bill Number',
        labelTitle: 'Title',
        helpTextNumber: 'Enter the bill number or legislative reference',
      },
    },
  },

  sw: {
    ui: {
      button: {
        submit: 'Tuma',
        cancel: 'Ghairi',
      },
      error: {
        network: 'Muunganisho wa mtandao umeshindwa',
        notFound: 'Ukurasa huu haupatikani',
      },
    },
    page: {
      legislature: {
        title: 'Bunge la Kitaifa',
        description: 'Tazama na uchambuzi muswada',
      },
    },
    form: {
      bill: {
        labelNumber: 'Namba ya Muswada',
        labelTitle: 'Kichwa',
        helpTextNumber: 'Ingiza namba ya muswada au kumbukumbu ya sheria',
      },
    },
  },
};

/**
 * Testing Checklist for Multilingual Support
 */
export const MultilingualTestingChecklist = {
  typography: [
    '☐ No text overflow in all UI elements',
    '☐ Line heights accommodate character expansion',
    '☐ Buttons/fields sized for longest translation',
    '☐ Font loads correctly for all languages',
    '☐ Diacritics render properly (Swahili ā, ē, ī, ō, ū)',
  ],

  functionality: [
    '☐ Language switcher works on all pages',
    '☐ Language preference persists after page refresh',
    '☐ URLs handle language parameter correctly',
    '☐ All UI text updates when language changes',
    '☐ Forms submit with correct language context',
  ],

  translation: [
    '☐ No missing translation keys',
    '☐ Placeholder text translatable, not hardcoded',
    '☐ Error messages localized',
    '☐ Dates/numbers format correctly by locale',
    '☐ All help text and tooltips translated',
  ],

  accessibility: [
    '☐ lang attribute correct on html element',
    '☐ Screen reader pronounces language correctly',
    '☐ Focus visible in all language contexts',
    '☐ Keyboard navigation works with all layouts',
    '☐ Color-coded content works without translation',
  ],

  culturalAppropriateness: [
    '☐ Swahili speaker reviewed translations',
    '☐ No cultural insensitivity in microcopy',
    '☐ Idioms/references appropriate for region',
    '☐ Examples use locally relevant context',
    '☐ Icons/imagery culturally appropriate',
  ],
};

/**
 * Implementation Hook for i18n Integration
 */
export interface I18nConfig {
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
