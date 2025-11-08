/**
 * Internationalization utilities for client
 * Simple implementation to replace @shared/i18n/en
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
    refresh: 'Refresh'
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

export type TranslationKey = keyof typeof en;
export type Translations = typeof en;