/**
 * Internationalization utilities for client
 * Complete i18n implementation with Kenyan context
 */

export type SupportedLanguage = 'en' | 'sw';

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
    selectLanguage: 'Select Language',
    changeLanguage: 'Language changed to {{current}}'
  },
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard',
    bills: 'Bills',
    analysis: 'Analysis',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    menu: 'Menu'
  },
  errors: {
    generic: 'Something went wrong',
    network: 'Network error occurred',
    notFound: 'Page not found',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access forbidden',
    validation: 'Validation error',
    timeout: 'Request timed out'
  },
  auth: {
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember Me',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out'
  }
};

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
    selectLanguage: 'Chagua Lugha',
    changeLanguage: 'Lugha imebadilishwa kuwa {{current}}'
  },
  navigation: {
    home: 'Nyumbani',
    dashboard: 'Dashibodi',
    bills: 'Miswada',
    analysis: 'Uchambuzi',
    settings: 'Mipangilio',
    profile: 'Wasifu',
    logout: 'Toka',
    menu: 'Menyu'
  },
  errors: {
    generic: 'Kuna tatizo lililotokea',
    network: 'Hitilafu ya mtandao',
    notFound: 'Ukurasa haujapatikana',
    unauthorized: 'Hauruhusiwi',
    forbidden: 'Marufuku',
    validation: 'Hitilafu ya uthibitisho',
    timeout: 'Muda umeisha'
  },
  auth: {
    login: 'Ingia',
    register: 'Jisajili',
    email: 'Barua pepe',
    password: 'Nenosiri',
    confirmPassword: 'Thibitisha Nenosiri',
    forgotPassword: 'Umesahau Nenosiri?',
    rememberMe: 'Nikumbuke',
    signIn: 'Ingia',
    signUp: 'Jisajili',
    signOut: 'Toka'
  }
};

export const languages = { en, sw };

export type TranslationKey = keyof typeof en;
export type Translations = typeof en;

/**
 * Detect user's preferred language
 */
export const detectLanguage = (): SupportedLanguage => {
  // Check localStorage first
  const saved = localStorage.getItem('chanuka-language');
  if (saved && (saved === 'en' || saved === 'sw')) {
    return saved as SupportedLanguage;
  }

  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('sw')) {
    return 'sw';
  }

  // Default to English
  return 'en';
};

/**
 * Save language preference
 */
export const saveLanguagePreference = (language: SupportedLanguage): void => {
  localStorage.setItem('chanuka-language', language);
};

/**
 * Get Kenyan context information
 */
export const getKenyanContext = () => {
  return {
    timezone: 'Africa/Nairobi',
    currency: 'KES',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    phoneFormat: '+254',
    regions: [
      'Nairobi',
      'Mombasa',
      'Kisumu',
      'Nakuru',
      'Eldoret',
      'Thika',
      'Malindi',
      'Kitale'
    ]
  };
};
