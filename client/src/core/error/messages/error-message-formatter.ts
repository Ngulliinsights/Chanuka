/**
 * Error Message Formatting Utilities
 *
 * Utilities for formatting error messages with context, variables, and consistent styling
 */

import { AppError, ErrorContext } from '../types';
import { ErrorMessageTemplate, getBestMatchTemplate, getLocalizedMessage } from './error-message-templates';
import { ErrorDomain, ErrorSeverity } from '../constants';

// ============================================================================
// Error Message Formatter
// ============================================================================

export interface FormattedErrorMessage {
  title: string;
  message: string;
  technicalDetails?: string;
  recoverySuggestions: string[];
  helpLink?: string;
  icon?: string;
  severity: ErrorSeverity;
  domain: ErrorDomain;
  errorCode?: string;
  context?: ErrorContext;
}

export interface FormatOptions {
  locale?: string;
  showTechnicalDetails?: boolean;
  includeContext?: boolean;
  maxSuggestions?: number;
}

// ============================================================================
// Core Formatting Functions
// ============================================================================

export function formatErrorMessage(
  error: AppError | Error,
  options: FormatOptions = {}
): FormattedErrorMessage {
  const { locale = 'en-US', showTechnicalDetails = false, includeContext = true, maxSuggestions = 3 } = options;

  // Handle both AppError and standard Error
  const appError = error instanceof AppError ? error : createAppErrorFromError(error);

  // Get the best matching template
  const template = getBestMatchTemplate(
    appError.type,
    appError.severity,
    appError.code
  );

  // Format the message with context variables
  const formattedMessage = formatMessageWithContext(template.message, appError);
  const formattedTitle = formatMessageWithContext(template.title, appError);

  // Get localized message if available
  const localizedMessage = getLocalizedMessage(template.id, locale);

  // Build recovery suggestions
  const suggestions = template.recoverySuggestions ?
    template.recoverySuggestions.slice(0, maxSuggestions) : [];

  // Build technical details if requested
  let technicalDetails: string | undefined;
  if (showTechnicalDetails && template.technicalMessage) {
    technicalDetails = formatMessageWithContext(template.technicalMessage, appError);
  }

  // Include context information if requested
  let context: ErrorContext | undefined;
  if (includeContext && appError.context) {
    context = { ...appError.context };
    // Remove sensitive data from context
    delete context.userAgent;
    delete context.sessionId;
  }

  return {
    title: formattedTitle,
    message: localizedMessage || formattedMessage,
    technicalDetails,
    recoverySuggestions: suggestions,
    helpLink: template.helpLink,
    icon: template.icon,
    severity: appError.severity,
    domain: appError.type,
    errorCode: appError.code,
    context,
  };
}

// ============================================================================
// Context-Based Formatting
// ============================================================================

export function formatMessageWithContext(
  message: string,
  error: AppError
): string {
  if (!message || !error) return message;

  // Replace common placeholders
  let formatted = message
    .replace(/{errorCode}/g, error.code || 'UNKNOWN')
    .replace(/{errorMessage}/g, error.message || '')
    .replace(/{endpoint}/g, (error.context?.url || error.details?.url || 'unknown endpoint') as string)
    .replace(/{timeout}/g, error.details?.timeout ? String(error.details.timeout) : 'unknown')
    .replace(/{statusCode}/g, error.statusCode ? String(error.statusCode) : 'unknown')
    .replace(/{statusText}/g, error.details?.statusText ? String(error.details.statusText) : 'unknown')
    .replace(/{fieldName}/g, error.details?.fieldName ? String(error.details.fieldName) : 'field')
    .replace(/{validationError}/g, error.details?.validationError ? String(error.details.validationError) : 'validation error')
    .replace(/{serviceName}/g, error.details?.serviceName ? String(error.details.serviceName) : 'external service')
    .replace(/{memoryUsage}/g, error.details?.memoryUsage ? formatMemoryUsage(error.details.memoryUsage as number) : 'high memory')
    .replace(/{errorDetails}/g, error.message || 'unknown error');

  // Add component context if available
  if (error.context?.component) {
    formatted = formatted.replace(/\.$/, '') + ` (${error.context.component})`;
  }

  return formatted;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createAppErrorFromError(error: Error): AppError {
  return new AppError(
    error.message || 'An unknown error occurred',
    error.name || 'UNKNOWN_ERROR',
    ErrorDomain.SYSTEM,
    ErrorSeverity.MEDIUM,
    {
      context: {
        component: 'ErrorFormatter',
        timestamp: Date.now(),
      },
      details: {
        originalError: error.message,
        stack: error.stack,
      },
    }
  );
}

export function formatMemoryUsage(memoryInBytes: number): string {
  if (memoryInBytes < 1024) return `${memoryInBytes} B`;
  if (memoryInBytes < 1024 * 1024) return `${(memoryInBytes / 1024).toFixed(2)} KB`;
  if (memoryInBytes < 1024 * 1024 * 1024) return `${(memoryInBytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(memoryInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatErrorForDisplay(
  error: AppError | Error,
  options: {
    showTitle?: boolean;
    showSuggestions?: boolean;
    showHelpLink?: boolean;
    showTechnicalDetails?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    showTitle = true,
    showSuggestions = true,
    showHelpLink = true,
    showTechnicalDetails = false,
    locale = 'en-US',
  } = options;

  const formatted = formatErrorMessage(error, {
    locale,
    showTechnicalDetails,
    includeContext: false,
  });

  let result = '';

  if (showTitle) {
    result += `**${formatted.title}**\n\n`;
  }

  result += formatted.message;

  if (showTechnicalDetails && formatted.technicalDetails) {
    result += `\n\n*Technical Details:* ${formatted.technicalDetails}`;
  }

  if (showSuggestions && formatted.recoverySuggestions.length > 0) {
    result += '\n\n*Suggestions:*';
    formatted.recoverySuggestions.forEach((suggestion, index) => {
      result += `\n${index + 1}. ${suggestion}`;
    });
  }

  if (showHelpLink && formatted.helpLink) {
    result += `\n\n[Get Help](${formatted.helpLink})`;
  }

  if (formatted.errorCode) {
    result += `\n\n*Error Code:* ${formatted.errorCode}`;
  }

  return result;
}

// ============================================================================
// HTML Formatting for UI Components
// ============================================================================

export function formatErrorForHTML(
  error: AppError | Error,
  options: FormatOptions & {
    showTitle?: boolean;
    showSuggestions?: boolean;
    showHelpLink?: boolean;
    showTechnicalDetails?: boolean;
  } = {}
): string {
  const {
    showTitle = true,
    showSuggestions = true,
    showHelpLink = true,
    showTechnicalDetails = false,
    ...formatOptions
  } = options;

  const formatted = formatErrorMessage(error, formatOptions);

  let html = '';

  if (showTitle) {
    html += `<h3 class="error-title">${escapeHtml(formatted.title)}</h3>`;
  }

  html += `<p class="error-message">${escapeHtml(formatted.message)}</p>`;

  if (showTechnicalDetails && formatted.technicalDetails) {
    html += `<div class="error-technical">`;
    html += `<strong>Technical Details:</strong> ${escapeHtml(formatted.technicalDetails)}`;
    html += `</div>`;
  }

  if (showSuggestions && formatted.recoverySuggestions.length > 0) {
    html += `<div class="error-suggestions">`;
    html += `<strong>Suggestions:</strong>`;
    html += `<ul>`;
    formatted.recoverySuggestions.forEach(suggestion => {
      html += `<li>${escapeHtml(suggestion)}</li>`;
    });
    html += `</ul>`;
    html += `</div>`;
  }

  if (showHelpLink && formatted.helpLink) {
    html += `<div class="error-help">`;
    html += `<a href="${escapeHtml(formatted.helpLink)}" target="_blank" rel="noopener noreferrer">`;
    html += `Get Help`;
    html += `</a>`;
    html += `</div>`;
  }

  if (formatted.errorCode) {
    html += `<div class="error-code">`;
    html += `<strong>Error Code:</strong> ${escapeHtml(formatted.errorCode)}`;
    html += `</div>`;
  }

  return html;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/\"/g, '"')
    .replace(/'/g, '&#039;');
}

export function getErrorSeverityClass(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'error-critical';
    case ErrorSeverity.HIGH:
      return 'error-high';
    case ErrorSeverity.MEDIUM:
      return 'error-medium';
    case ErrorSeverity.LOW:
      return 'error-low';
    default:
      return 'error-medium';
  }
}

export function getErrorIconClass(domain: ErrorDomain): string {
  const iconMap: Record<ErrorDomain, string> = {
    [ErrorDomain.NETWORK]: 'wifi-off',
    [ErrorDomain.AUTHENTICATION]: 'log-out',
    [ErrorDomain.AUTHORIZATION]: 'shield-off',
    [ErrorDomain.VALIDATION]: 'alert-triangle',
    [ErrorDomain.DATABASE]: 'database-off',
    [ErrorDomain.EXTERNAL_SERVICE]: 'cloud-off',
    [ErrorDomain.BUSINESS_LOGIC]: 'ban',
    [ErrorDomain.CACHE]: 'refresh',
    [ErrorDomain.SYSTEM]: 'alert-octagon',
    [ErrorDomain.UNKNOWN]: 'alert-circle',
    [ErrorDomain.PERMISSION]: 'shield-off',
    [ErrorDomain.SECURITY]: 'shield-alert',
    [ErrorDomain.SESSION]: 'log-out',
    [ErrorDomain.RESOURCE]: 'file-off',
    [ErrorDomain.RATE_LIMITING]: 'timer-off',
    [ErrorDomain.UI]: 'monitor-off',
    [ErrorDomain.HOOKS]: 'hook',
    [ErrorDomain.LIBRARY_SERVICES]: 'library',
    [ErrorDomain.SERVICE_ARCHITECTURE]: 'settings',
    [ErrorDomain.CROSS_SYSTEM]: 'link',
    [ErrorDomain.USER_INPUT]: 'user-x',
    [ErrorDomain.CONFIGURATION]: 'settings',
    [ErrorDomain.INTEGRATION]: 'plug',
    [ErrorDomain.PERFORMANCE]: 'zap',
    [ErrorDomain.FILE_SYSTEM]: 'folder-off',
  };

  return iconMap[domain] || 'alert-circle';
}
