/**
 * Internationalization utilities for Chanuka client
 * Comprehensive i18n implementation with Kenyan context
 * @module i18n
 */

export type SupportedLanguage = 'en' | 'sw';

/**
 * English translations
 */
export const en = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    submit: 'Submit',
    confirm: 'Confirm',
    selectLanguage: 'Select Language',
    changeLanguage: 'Language changed to {{language}}',
    noData: 'No data available',
    loadMore: 'Load More',
    viewAll: 'View All',
    collapse: 'Collapse',
    expand: 'Expand',
  },
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard',
    bills: 'Bills',
    analysis: 'Analysis',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    menu: 'Menu',
    notifications: 'Notifications',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network connection error. Please check your internet.',
    notFound: 'Page not found',
    unauthorized: 'You are not authorized to access this resource',
    forbidden: 'Access to this resource is forbidden',
    validation: 'Please check your input and try again',
    timeout: 'Request timed out. Please try again.',
    serverError: 'Server error occurred. Please try again later.',
    sessionExpired: 'Your session has expired. Please log in again.',
  },
  auth: {
    login: 'Log In',
    register: 'Register',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember Me',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    resetPassword: 'Reset Password',
    verifyEmail: 'Verify Email',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    loginSuccess: 'Logged in successfully',
    logoutSuccess: 'Logged out successfully',
    registrationSuccess: 'Registration successful',
  },
  bills: {
    title: 'Parliamentary Bills',
    viewBill: 'View Bill',
    searchBills: 'Search bills...',
    filterByStatus: 'Filter by Status',
    filterByCategory: 'Filter by Category',
    status: 'Status',
    category: 'Category',
    publishedDate: 'Published Date',
    summary: 'Summary',
    fullText: 'Full Text',
    amendments: 'Amendments',
    votingHistory: 'Voting History',
    relatedBills: 'Related Bills',
    noResults: 'No bills found matching your search',
  },
  dashboard: {
    welcome: 'Welcome back, {{name}}',
    overview: 'Overview',
    recentActivity: 'Recent Activity',
    statistics: 'Statistics',
    quickActions: 'Quick Actions',
    upcomingVotes: 'Upcoming Votes',
    trendingBills: 'Trending Bills',
    lastUpdated: 'Last updated {{time}}',
  },
  analysis: {
    title: 'Bill Analysis',
    keyPoints: 'Key Points',
    impact: 'Potential Impact',
    stakeholders: 'Stakeholders',
    timeline: 'Timeline',
    recommendations: 'Recommendations',
    aiSummary: 'AI Summary',
    sentimentAnalysis: 'Sentiment Analysis',
    compareBills: 'Compare Bills',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    notifications: 'Notifications',
    privacy: 'Privacy',
    account: 'Account',
    appearance: 'Appearance',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    darkMode: 'Dark Mode',
    saveChanges: 'Save Changes',
    changesSaved: 'Changes saved successfully',
  },
  validation: {
    required: '{{field}} is required',
    invalidEmail: 'Please enter a valid email address',
    passwordTooShort: 'Password must be at least {{min}} characters',
    passwordMismatch: 'Passwords do not match',
    invalidPhone: 'Please enter a valid Kenyan phone number',
    invalidFormat: 'Invalid format',
  },
  dates: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    daysAgo: '{{count}} days ago',
    weeksAgo: '{{count}} weeks ago',
    monthsAgo: '{{count}} months ago',
    yearsAgo: '{{count}} years ago',
    justNow: 'Just now',
  },
} as const;

/**
 * Swahili translations
 */
export const sw = {
  common: {
    loading: 'Inapakia...',
    error: 'Hitilafu',
    retry: 'Jaribu Tena',
    cancel: 'Ghairi',
    save: 'Hifadhi',
    delete: 'Futa',
    edit: 'Hariri',
    close: 'Funga',
    back: 'Rudi',
    next: 'Ifuatayo',
    previous: 'Iliyotangulia',
    search: 'Tafuta',
    filter: 'Chuja',
    sort: 'Panga',
    refresh: 'Onyesha Upya',
    submit: 'Wasilisha',
    confirm: 'Thibitisha',
    selectLanguage: 'Chagua Lugha',
    changeLanguage: 'Lugha imebadilishwa kuwa {{language}}',
    noData: 'Hakuna data inayopatikana',
    loadMore: 'Pakia Zaidi',
    viewAll: 'Angalia Zote',
    collapse: 'Kunja',
    expand: 'Panua',
  },
  navigation: {
    home: 'Nyumbani',
    dashboard: 'Dashibodi',
    bills: 'Miswada',
    analysis: 'Uchambuzi',
    settings: 'Mipangilio',
    profile: 'Wasifu',
    logout: 'Toka',
    menu: 'Menyu',
    notifications: 'Arifa',
  },
  errors: {
    generic: 'Kuna tatizo lililotokea. Tafadhali jaribu tena.',
    network: 'Hitilafu ya muunganisho wa mtandao. Angalia intaneti yako.',
    notFound: 'Ukurasa haujapatikana',
    unauthorized: 'Huna ruhusa ya kufikia rasilimali hii',
    forbidden: 'Ufikiaji wa rasilimali hii umekatazwa',
    validation: 'Tafadhali angalia maingizo yako na ujaribu tena',
    timeout: 'Muda wa ombi umeisha. Tafadhali jaribu tena.',
    serverError: 'Hitilafu ya seva imetokea. Jaribu tena baadaye.',
    sessionExpired: 'Kipindi chako kimeisha. Tafadhali ingia tena.',
  },
  auth: {
    login: 'Ingia',
    register: 'Jisajili',
    email: 'Barua Pepe',
    password: 'Nenosiri',
    confirmPassword: 'Thibitisha Nenosiri',
    forgotPassword: 'Umesahau Nenosiri?',
    rememberMe: 'Nikumbuke',
    signIn: 'Ingia',
    signUp: 'Jisajili',
    signOut: 'Toka',
    resetPassword: 'Weka Upya Nenosiri',
    verifyEmail: 'Thibitisha Barua Pepe',
    emailPlaceholder: 'Weka barua pepe yako',
    passwordPlaceholder: 'Weka nenosiri lako',
    loginSuccess: 'Umeingia kwa mafanikio',
    logoutSuccess: 'Umetoka kwa mafanikio',
    registrationSuccess: 'Usajili umefanikiwa',
  },
  bills: {
    title: 'Miswada ya Bunge',
    viewBill: 'Angalia Muswada',
    searchBills: 'Tafuta miswada...',
    filterByStatus: 'Chuja kwa Hali',
    filterByCategory: 'Chuja kwa Jamii',
    status: 'Hali',
    category: 'Jamii',
    publishedDate: 'Tarehe ya Uchapishaji',
    summary: 'Muhtasari',
    fullText: 'Maandishi Kamili',
    amendments: 'Marekebisho',
    votingHistory: 'Historia ya Kura',
    relatedBills: 'Miswada Inayohusiana',
    noResults: 'Hakuna miswada inayolingana na utafutaji wako',
  },
  dashboard: {
    welcome: 'Karibu tena, {{name}}',
    overview: 'Muhtasari',
    recentActivity: 'Shughuli za Hivi Karibuni',
    statistics: 'Takwimu',
    quickActions: 'Vitendo vya Haraka',
    upcomingVotes: 'Kura Zinazokuja',
    trendingBills: 'Miswada Inayovuma',
    lastUpdated: 'Ilisasishwa mwisho {{time}}',
  },
  analysis: {
    title: 'Uchambuzi wa Muswada',
    keyPoints: 'Mambo Muhimu',
    impact: 'Athari Inayowezekana',
    stakeholders: 'Wadau',
    timeline: 'Ratiba',
    recommendations: 'Mapendekezo',
    aiSummary: 'Muhtasari wa AI',
    sentimentAnalysis: 'Uchambuzi wa Hisia',
    compareBills: 'Linganisha Miswada',
  },
  settings: {
    title: 'Mipangilio',
    language: 'Lugha',
    notifications: 'Arifa',
    privacy: 'Faragha',
    account: 'Akaunti',
    appearance: 'Mwonekano',
    emailNotifications: 'Arifa za Barua Pepe',
    pushNotifications: 'Arifa za Kusukuma',
    darkMode: 'Hali ya Giza',
    saveChanges: 'Hifadhi Mabadiliko',
    changesSaved: 'Mabadiliko yamehifadhiwa kwa mafanikio',
  },
  validation: {
    required: '{{field}} inahitajika',
    invalidEmail: 'Tafadhali weka barua pepe halali',
    passwordTooShort: 'Nenosiri lazima liwe na angalau herufi {{min}}',
    passwordMismatch: 'Nenosiri hazilingani',
    invalidPhone: 'Tafadhali weka nambari halali ya simu ya Kenya',
    invalidFormat: 'Muundo si halali',
  },
  dates: {
    today: 'Leo',
    yesterday: 'Jana',
    tomorrow: 'Kesho',
    daysAgo: 'Siku {{count}} zilizopita',
    weeksAgo: 'Wiki {{count}} zilizopita',
    monthsAgo: 'Miezi {{count}} iliyopita',
    yearsAgo: 'Miaka {{count}} iliyopita',
    justNow: 'Sasa hivi',
  },
} as const;

export const languages = { en, sw } as const;

export type TranslationKey = keyof typeof en;
export type Translations = typeof en;

/**
 * Deep nested key paths for type-safe translation keys
 */
type PathImpl<T, K extends keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? T[K] extends ArrayLike<any>
      ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}`
      : K | `${K}.${PathImpl<T[K], keyof T[K]>}`
    : K
  : never;

type Path<T> = PathImpl<T, keyof T> | keyof T;

export type TranslationPath = Path<Translations>;

/**
 * Interpolation values for translation strings
 */
export interface InterpolationValues {
  [key: string]: string | number;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Interpolate values into translation string
 * Example: "Hello {{name}}" with {name: "John"} becomes "Hello John"
 */
export function interpolate(
  text: string,
  values?: InterpolationValues
): string {
  if (!values) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get translation by key with type safety and interpolation
 */
export function getTranslation(
  language: SupportedLanguage,
  key: string,
  values?: InterpolationValues
): string {
  const translations = languages[language];
  const text = getNestedValue(translations, key);

  if (!text) {
    console.warn(`Translation missing for key: ${key} (${language})`);
    return key;
  }

  return interpolate(text, values);
}

/**
 * Detect user's preferred language with fallbacks
 */
export function detectLanguage(): SupportedLanguage {
  try {
    // Check localStorage first
    const saved = localStorage.getItem('chanuka-language');
    if (saved === 'en' || saved === 'sw') {
      return saved;
    }
  } catch (error) {
    console.warn('localStorage not available:', error);
  }

  // Check browser language
  try {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('sw')) {
      return 'sw';
    }
  } catch (error) {
    console.warn('navigator.language not available:', error);
  }

  // Default to English
  return 'en';
}

/**
 * Save language preference with error handling
 */
export function saveLanguagePreference(language: SupportedLanguage): boolean {
  try {
    localStorage.setItem('chanuka-language', language);
    return true;
  } catch (error) {
    console.error('Failed to save language preference:', error);
    return false;
  }
}

/**
 * Validate if a string is a supported language
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return lang === 'en' || lang === 'sw';
}

/**
 * Kenyan localization context
 */
export interface KenyanContext {
  timezone: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: number;
  phonePrefix: string;
  phonePattern: RegExp;
  regions: readonly string[];
  counties: readonly string[];
}

/**
 * Get comprehensive Kenyan context information
 */
export function getKenyanContext(): KenyanContext {
  return {
    timezone: 'Africa/Nairobi',
    currency: 'KES',
    currencySymbol: 'KSh',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    phonePrefix: '+254',
    phonePattern: /^(\+?254|0)?([17]\d{8})$/,
    regions: [
      'Nairobi',
      'Mombasa',
      'Kisumu',
      'Nakuru',
      'Eldoret',
      'Thika',
      'Malindi',
      'Kitale',
    ] as const,
    counties: [
      'Nairobi',
      'Mombasa',
      'Kisumu',
      'Nakuru',
      'Uasin Gishu',
      'Kiambu',
      'Kilifi',
      'Trans Nzoia',
      'Machakos',
      'Kajiado',
      'Nyeri',
      'Meru',
      'Kakamega',
      'Bungoma',
      'Kisii',
      'Nyamira',
      'Kericho',
      'Bomet',
      'Nandi',
      'Baringo',
      'Laikipia',
      'Samburu',
      'Turkana',
      'West Pokot',
      'Marsabit',
      'Isiolo',
      'Garissa',
      'Wajir',
      'Mandera',
      'Lamu',
      'Tana River',
      'Taita Taveta',
      'Kwale',
      'Makueni',
      'Kitui',
      'Embu',
      'Tharaka Nithi',
      "Murang'a",
      'Kirinyaga',
      'Nyandarua',
      'Narok',
      'Vihiga',
      'Busia',
      'Siaya',
      'Homa Bay',
      'Migori',
      'Elgeyo Marakwet',
    ] as const,
  };
}

/**
 * Format currency for Kenyan context
 */
export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  const context = getKenyanContext();
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: context.currency,
    ...options,
  }).format(amount);
}

/**
 * Format date for Kenyan context
 */
export function formatDate(
  date: Date | string | number,
  language: SupportedLanguage = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  const locale = language === 'sw' ? 'sw-KE' : 'en-KE';
  const context = getKenyanContext();

  return new Intl.DateTimeFormat(locale, {
    timeZone: context.timezone,
    ...options,
  }).format(d);
}

/**
 * Format phone number for Kenyan context
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const context = getKenyanContext();

  if (cleaned.startsWith('254')) {
    return `${context.phonePrefix}${cleaned.slice(3)}`;
  }
  if (cleaned.startsWith('0')) {
    return `${context.phonePrefix}${cleaned.slice(1)}`;
  }
  if (cleaned.length === 9) {
    return `${context.phonePrefix}${cleaned}`;
  }

  return phone;
}

/**
 * Validate Kenyan phone number
 */
export function isValidKenyanPhone(phone: string): boolean {
  const context = getKenyanContext();
  return context.phonePattern.test(phone);
}

/**
 * Get relative time string
 */
export function getRelativeTime(
  date: Date | string | number,
  language: SupportedLanguage = 'en'
): string {
  const d = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const t = languages[language].dates;

  if (diffSecs < 60) return t.justNow;
  if (diffDays === 0 && diffHours < 24) {
    return formatDate(d, language, { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return t.yesterday;
  if (diffDays < 7) return interpolate(t.daysAgo, { count: diffDays });
  if (diffWeeks < 4) return interpolate(t.weeksAgo, { count: diffWeeks });
  if (diffMonths < 12) return interpolate(t.monthsAgo, { count: diffMonths });
  return interpolate(t.yearsAgo, { count: diffYears });
}

/**
 * Export all utilities as a namespace
 */
export const i18n = {
  languages,
  detectLanguage,
  saveLanguagePreference,
  isSupportedLanguage,
  getTranslation,
  interpolate,
  getKenyanContext,
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  isValidKenyanPhone,
  getRelativeTime,
};
