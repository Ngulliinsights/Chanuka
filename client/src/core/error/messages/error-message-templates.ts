/**
 * User-Friendly Error Message Templates
 *
 * Centralized error message templates for consistent, user-friendly error messages
 * across all client systems (Security, Hooks, Library Services, Service Architecture)
 */

import { ErrorDomain, ErrorSeverity } from '../constants';

// ============================================================================
// Error Message Template Types
// ============================================================================

export interface ErrorMessageTemplate {
  id: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  title: string;
  message: string;
  technicalMessage?: string;
  recoverySuggestions?: string[];
  helpLink?: string;
  icon?: string;
  priority: number;
}

// ============================================================================
// Core Error Message Templates
// ============================================================================

export const ERROR_MESSAGE_TEMPLATES: ErrorMessageTemplate[] = [
  // Network Errors
  {
    id: 'network-connection-failed',
    domain: ErrorDomain.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    title: 'Connection Problem',
    message: 'We couldn\'t connect to the server. Please check your internet connection and try again.',
    technicalMessage: 'Failed to establish network connection to {endpoint}',
    recoverySuggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'If the problem persists, try again later',
    ],
    helpLink: '/help/connection-issues',
    icon: 'wifi-off',
    priority: 1,
  },

  {
    id: 'network-timeout',
    domain: ErrorDomain.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    title: 'Request Timeout',
    message: 'The request took too long to complete. This might be due to a slow connection or server issues.',
    technicalMessage: 'Network request timed out after {timeout}ms',
    recoverySuggestions: [
      'Check your internet connection speed',
      'Try again with a better connection',
      'Reduce the amount of data being requested',
    ],
    helpLink: '/help/timeout-issues',
    icon: 'clock',
    priority: 2,
  },

  {
    id: 'network-server-error',
    domain: ErrorDomain.NETWORK,
    severity: ErrorSeverity.HIGH,
    title: 'Server Error',
    message: 'The server encountered an error while processing your request. Our team has been notified.',
    technicalMessage: 'Server returned HTTP {statusCode}: {statusText}',
    recoverySuggestions: [
      'Wait a few minutes and try again',
      'Check our status page for updates',
      'Contact support if the issue persists',
    ],
    helpLink: '/help/server-errors',
    icon: 'server-off',
    priority: 3,
  },

  // Authentication Errors
  {
    id: 'auth-session-expired',
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
    technicalMessage: 'Authentication token expired or invalid',
    recoverySuggestions: [
      'Log in again to continue',
      'Use the "Remember me" option to stay logged in longer',
      'Check your internet connection if login fails',
    ],
    helpLink: '/help/session-issues',
    icon: 'log-out',
    priority: 1,
  },

  {
    id: 'auth-invalid-credentials',
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect. Please try again.',
    technicalMessage: 'Authentication failed: invalid credentials',
    recoverySuggestions: [
      'Double-check your email and password',
      'Use the "Forgot password" option if needed',
      'Ensure caps lock is off',
    ],
    helpLink: '/help/login-issues',
    icon: 'alert-circle',
    priority: 2,
  },

  {
    id: 'auth-permission-denied',
    domain: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    title: 'Access Denied',
    message: 'You don\'t have permission to access this resource or perform this action.',
    technicalMessage: 'Authorization failed: insufficient permissions for {resource}',
    recoverySuggestions: [
      'Contact your administrator for access',
      'Check if you\'re logged in with the correct account',
      'Review your role and permissions',
    ],
    helpLink: '/help/access-issues',
    icon: 'shield-off',
    priority: 1,
  },

  // Validation Errors
  {
    id: 'validation-invalid-input',
    domain: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    title: 'Invalid Input',
    message: 'The information you provided contains errors. Please review and correct the highlighted fields.',
    technicalMessage: 'Validation failed for field {fieldName}: {validationError}',
    recoverySuggestions: [
      'Check the highlighted fields',
      'Follow the format instructions',
      'Provide all required information',
    ],
    helpLink: '/help/form-validation',
    icon: 'alert-triangle',
    priority: 1,
  },

  {
    id: 'validation-required-field',
    domain: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    title: 'Missing Required Information',
    message: 'Please fill in all required fields before submitting.',
    technicalMessage: 'Required field {fieldName} is missing',
    recoverySuggestions: [
      'Complete all required fields',
      'Look for fields marked with *',
      'Provide the missing information',
    ],
    helpLink: '/help/required-fields',
    icon: 'help-circle',
    priority: 2,
  },

  // Database Errors
  {
    id: 'database-connection-failed',
    domain: ErrorDomain.DATABASE,
    severity: ErrorSeverity.HIGH,
    title: 'Database Unavailable',
    message: 'We\'re having trouble connecting to our database. Please try again in a few minutes.',
    technicalMessage: 'Database connection failed: {errorDetails}',
    recoverySuggestions: [
      'Wait a few minutes and try again',
      'Check our status page for updates',
      'Contact support if the issue persists',
    ],
    helpLink: '/help/database-issues',
    icon: 'database-off',
    priority: 1,
  },

  {
    id: 'database-query-failed',
    domain: ErrorDomain.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    title: 'Data Access Error',
    message: 'We couldn\'t retrieve the requested data. This might be a temporary issue.',
    technicalMessage: 'Database query failed: {queryError}',
    recoverySuggestions: [
      'Try refreshing the page',
      'Narrow your search criteria',
      'Try again later',
    ],
    helpLink: '/help/data-access',
    icon: 'search-off',
    priority: 2,
  },

  // System Errors
  {
    id: 'system-unexpected-error',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Our team has been notified and is working to fix it.',
    technicalMessage: 'Unexpected system error: {errorDetails}',
    recoverySuggestions: [
      'Refresh the page',
      'Try again in a few minutes',
      'Contact support with error details',
    ],
    helpLink: '/help/unexpected-errors',
    icon: 'alert-octagon',
    priority: 1,
  },

  {
    id: 'system-memory-error',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    title: 'Memory Issue',
    message: 'The application is using too much memory. Please close other tabs or restart your browser.',
    technicalMessage: 'Memory quota exceeded: {memoryUsage}',
    recoverySuggestions: [
      'Close unused browser tabs',
      'Restart your browser',
      'Clear browser cache',
    ],
    helpLink: '/help/memory-issues',
    icon: 'memory',
    priority: 1,
  },

  // External Service Errors
  {
    id: 'external-service-unavailable',
    domain: ErrorDomain.EXTERNAL_SERVICE,
    severity: ErrorSeverity.MEDIUM,
    title: 'Service Unavailable',
    message: 'An external service we depend on is temporarily unavailable. Please try again later.',
    technicalMessage: 'External service {serviceName} unavailable: {errorDetails}',
    recoverySuggestions: [
      'Wait and try again later',
      'Check if the service is down for everyone',
      'Use alternative functionality if available',
    ],
    helpLink: '/help/service-issues',
    icon: 'cloud-off',
    priority: 1,
  },

  // Business Logic Errors
  {
    id: 'business-rule-violation',
    domain: ErrorDomain.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    title: 'Operation Not Allowed',
    message: 'This operation cannot be completed due to business rules or constraints.',
    technicalMessage: 'Business rule violation: {ruleName}',
    recoverySuggestions: [
      'Review the operation requirements',
      'Contact support for assistance',
      'Check if preconditions are met',
    ],
    helpLink: '/help/business-rules',
    icon: 'ban',
    priority: 1,
  },

  // Cache Errors
  {
    id: 'cache-invalid',
    domain: ErrorDomain.CACHE,
    severity: ErrorSeverity.LOW,
    title: 'Cache Issue',
    message: 'There was a problem with cached data. We\'ll try to load fresh data.',
    technicalMessage: 'Cache data invalid or corrupted: {cacheKey}',
    recoverySuggestions: [
      'Refresh the page to reload data',
      'Clear your browser cache',
      'Try again in a few moments',
    ],
    helpLink: '/help/cache-issues',
    icon: 'refresh',
    priority: 1,
  },

  // Generic Fallback
  {
    id: 'generic-error',
    domain: ErrorDomain.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    title: 'Error',
    message: 'An error occurred while processing your request. Please try again.',
    technicalMessage: 'Generic error: {errorDetails}',
    recoverySuggestions: [
      'Refresh the page',
      'Try again later',
      'Contact support if the issue persists',
    ],
    helpLink: '/help/general-issues',
    icon: 'alert-circle',
    priority: 100,
  },
];

// ============================================================================
// Template Management Functions
// ============================================================================

export function getTemplateById(templateId: string): ErrorMessageTemplate | undefined {
  return ERROR_MESSAGE_TEMPLATES.find(template => template.id === templateId);
}

export function getTemplatesByDomain(domain: ErrorDomain): ErrorMessageTemplate[] {
  return ERROR_MESSAGE_TEMPLATES.filter(template => template.domain === domain)
    .sort((a, b) => a.priority - b.priority);
}

export function getTemplatesBySeverity(severity: ErrorSeverity): ErrorMessageTemplate[] {
  return ERROR_MESSAGE_TEMPLATES.filter(template => template.severity === severity)
    .sort((a, b) => a.priority - b.priority);
}

export function getBestMatchTemplate(
  domain: ErrorDomain,
  severity: ErrorSeverity,
  errorCode?: string
): ErrorMessageTemplate {
  // First try to find exact match by error code pattern
  const exactMatch = ERROR_MESSAGE_TEMPLATES.find(template =>
    errorCode && template.id.includes(errorCode.toLowerCase())
  );

  if (exactMatch) return exactMatch;

  // Then try to find by domain and severity
  const domainSeverityMatches = ERROR_MESSAGE_TEMPLATES.filter(
    template => template.domain === domain && template.severity === severity
  );

  if (domainSeverityMatches.length > 0) {
    return domainSeverityMatches.sort((a, b) => a.priority - b.priority)[0];
  }

  // Then try by domain only
  const domainMatches = ERROR_MESSAGE_TEMPLATES.filter(
    template => template.domain === domain
  );

  if (domainMatches.length > 0) {
    return domainMatches.sort((a, b) => a.priority - b.priority)[0];
  }

  // Finally return generic error
  return ERROR_MESSAGE_TEMPLATES.find(template => template.id === 'generic-error')!;
}

// ============================================================================
// Localization Support
// ============================================================================

export interface LocalizedErrorMessage {
  locale: string;
  translations: Record<string, string>;
}

export const DEFAULT_LOCALIZED_MESSAGES: Record<string, LocalizedErrorMessage> = {
  'en-US': {
    locale: 'en-US',
    translations: {
      'network-connection-failed': 'We couldn\'t connect to the server. Please check your internet connection and try again.',
      'network-timeout': 'The request took too long to complete. This might be due to a slow connection or server issues.',
      'auth-session-expired': 'Your session has expired. Please log in again to continue.',
      'auth-invalid-credentials': 'The email or password you entered is incorrect. Please try again.',
      'auth-permission-denied': 'You don\'t have permission to access this resource or perform this action.',
      'validation-invalid-input': 'The information you provided contains errors. Please review and correct the highlighted fields.',
      'database-connection-failed': 'We\'re having trouble connecting to our database. Please try again in a few minutes.',
      'system-unexpected-error': 'An unexpected error occurred. Our team has been notified and is working to fix it.',
      'external-service-unavailable': 'An external service we depend on is temporarily unavailable. Please try again later.',
      'business-rule-violation': 'This operation cannot be completed due to business rules or constraints.',
      'cache-invalid': 'There was a problem with cached data. We\'ll try to load fresh data.',
      'generic-error': 'An error occurred while processing your request. Please try again.',
    },
  },
  'es-ES': {
    locale: 'es-ES',
    translations: {
      'network-connection-failed': 'No pudimos conectarnos al servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.',
      'network-timeout': 'La solicitud tardó demasiado en completarse. Esto puede deberse a una conexión lenta o problemas del servidor.',
      'auth-session-expired': 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.',
      'auth-invalid-credentials': 'El correo electrónico o la contraseña que ingresaste son incorrectos. Por favor, inténtalo de nuevo.',
      'auth-permission-denied': 'No tienes permiso para acceder a este recurso o realizar esta acción.',
      'validation-invalid-input': 'La información que proporcionaste contiene errores. Por favor, revisa y corrige los campos resaltados.',
      'database-connection-failed': 'Estamos teniendo problemas para conectarnos a nuestra base de datos. Por favor, inténtalo de nuevo en unos minutos.',
      'system-unexpected-error': 'Ocurrió un error inesperado. Nuestro equipo ha sido notificado y está trabajando para solucionarlo.',
      'external-service-unavailable': 'Un servicio externo en el que dependemos no está disponible temporalmente. Por favor, inténtalo más tarde.',
      'business-rule-violation': 'Esta operación no se puede completar debido a reglas o restricciones de negocio.',
      'cache-invalid': 'Hubo un problema con los datos en caché. Intentaremos cargar datos nuevos.',
      'generic-error': 'Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
    },
  },
  'fr-FR': {
    locale: 'fr-FR',
    translations: {
      'network-connection-failed': 'Nous n\'avons pas pu nous connecter au serveur. Veuillez vérifier votre connexion Internet et réessayer.',
      'network-timeout': 'La requête a pris trop de temps à s\'exécuter. Cela peut être dû à une connexion lente ou à des problèmes de serveur.',
      'auth-session-expired': 'Votre session a expiré. Veuillez vous reconnecter pour continuer.',
      'auth-invalid-credentials': 'L\'email ou le mot de passe que vous avez saisi est incorrect. Veuillez réessayer.',
      'auth-permission-denied': 'Vous n\'avez pas la permission d\'accéder à cette ressource ou d\'effectuer cette action.',
      'validation-invalid-input': 'Les informations que vous avez fournies contiennent des erreurs. Veuillez vérifier et corriger les champs mis en évidence.',
      'database-connection-failed': 'Nous avons des problèmes pour nous connecter à notre base de données. Veuillez réessayer dans quelques minutes.',
      'system-unexpected-error': 'Une erreur inattendue est survenue. Notre équipe a été informée et travaille pour la résoudre.',
      'external-service-unavailable': 'Un service externe dont nous dépendons est temporairement indisponible. Veuillez réessayer plus tard.',
      'business-rule-violation': 'Cette opération ne peut pas être effectuée en raison de règles ou de contraintes commerciales.',
      'cache-invalid': 'Il y a eu un problème avec les données en cache. Nous allons essayer de charger des données fraîches.',
      'generic-error': 'Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.',
    },
  },
};

export function getLocalizedMessage(
  templateId: string,
  locale: string = 'en-US'
): string {
  const localizedMessages = DEFAULT_LOCALIZED_MESSAGES[locale];
  if (localizedMessages && localizedMessages.translations[templateId]) {
    return localizedMessages.translations[templateId];
  }

  // Fallback to English if translation not available
  return DEFAULT_LOCALIZED_MESSAGES['en-US'].translations[templateId] ||
         ERROR_MESSAGE_TEMPLATES.find(t => t.id === templateId)?.message ||
         'An error occurred. Please try again.';
}

export function addLocalizedMessages(locale: string, translations: Record<string, string>): void {
  if (!DEFAULT_LOCALIZED_MESSAGES[locale]) {
    DEFAULT_LOCALIZED_MESSAGES[locale] = {
      locale,
      translations: {},
    };
  }

  DEFAULT_LOCALIZED_MESSAGES[locale].translations = {
    ...DEFAULT_LOCALIZED_MESSAGES[locale].translations,
    ...translations,
  };
}
