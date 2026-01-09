/**
 * User-Friendly Error Message System
 *
 * Unified error message system providing consistent, helpful error messages
 * across all client systems with localization and recovery suggestions
 */

export type {
  ErrorMessageTemplate,
  LocalizedErrorMessage,
} from './error-message-templates';

export type {
  FormattedErrorMessage,
  FormatOptions,
} from './error-message-formatter';

export type {
  RecoverySuggestion,
  SuggestionAnalytics,
} from './error-recovery-suggestions';

export {
  getTemplateById,
  getTemplatesByDomain,
  getTemplatesBySeverity,
  getBestMatchTemplate,
  getLocalizedMessage,
  addLocalizedMessages
} from './error-message-templates';

export {
  formatErrorMessage,
  formatMessageWithContext,
  createAppErrorFromError,
  formatMemoryUsage,
  formatErrorForDisplay,
  formatErrorForHTML,
  escapeHtml,
  getErrorSeverityClass,
  getErrorIconClass
} from './error-message-formatter';

export {
  RECOVERY_SUGGESTIONS,
  getRecoverySuggestions,
  isSuggestionApplicable,
  convertSuggestionsToRecoveryStrategies,
  enhanceSuggestionsWithContext,
  trackSuggestionUsage,
  getSuggestionAnalytics,
  clearSuggestionAnalytics,
  getBestRecoverySuggestion,
  getSuggestionById,
  addCustomRecoverySuggestion,
  removeRecoverySuggestion
} from './error-recovery-suggestions';

// ============================================================================
// React Hooks
// ============================================================================

export {
  useErrorMessages,
  useErrorMessageComponent,
  useErrorRecovery,
  ErrorMessageProvider,
  useErrorMessageContext
} from './use-error-messages';

// ============================================================================
// Integrated Error Message Service
// ============================================================================

import { AppError } from '../types';
import { ErrorDomain, ErrorSeverity } from '../constants';
import { formatErrorMessage, FormatOptions } from './error-message-formatter';
import { getRecoverySuggestions } from './error-recovery-suggestions';
import { ErrorMessageTemplate, getBestMatchTemplate, getLocalizedMessage, addLocalizedMessages } from './error-message-templates';

export interface EnhancedErrorMessage {
  formattedMessage: ReturnType<typeof formatErrorMessage>;
  template: ErrorMessageTemplate;
  recoverySuggestions: ReturnType<typeof getRecoverySuggestions>;
}

export function createEnhancedErrorMessage(
  error: AppError | Error,
  options: FormatOptions & { maxSuggestions?: number } = {}
): EnhancedErrorMessage {
  const { maxSuggestions = 3, ...formatOptions } = options;

  const template = getBestMatchTemplate(
    error instanceof AppError ? error.type : ErrorDomain.SYSTEM,
    error instanceof AppError ? error.severity : ErrorSeverity.MEDIUM,
    error instanceof AppError ? error.code : undefined
  );

  return {
    formattedMessage: formatErrorMessage(error, formatOptions),
    template,
    recoverySuggestions: getRecoverySuggestions(
      error instanceof AppError ? error : new AppError(
        error.message || 'Unknown error',
        error.name || 'UNKNOWN_ERROR',
        ErrorDomain.SYSTEM,
        ErrorSeverity.MEDIUM
      ),
      {},
      maxSuggestions
    ),
  };
}

// ============================================================================
// Error Message Service Integration
// ============================================================================

export class ErrorMessageService {
  private static instance: ErrorMessageService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ErrorMessageService {
    if (!ErrorMessageService.instance) {
      ErrorMessageService.instance = new ErrorMessageService();
    }
    return ErrorMessageService.instance;
  }

  public formatError(error: AppError | Error, options: FormatOptions = {}): ReturnType<typeof formatErrorMessage> {
    return formatErrorMessage(error, options);
  }

  public getRecoverySuggestions(error: AppError, maxSuggestions: number = 3): ReturnType<typeof getRecoverySuggestions> {
    return getRecoverySuggestions(error, {}, maxSuggestions);
  }

  public createEnhancedMessage(error: AppError | Error, options: FormatOptions & { maxSuggestions?: number } = {}): EnhancedErrorMessage {
    return createEnhancedErrorMessage(error, options);
  }

  public getLocalizedMessage(templateId: string, locale: string = 'en-US'): string {
    return getLocalizedMessage(templateId, locale);
  }

  public addLocalizedMessages(locale: string, translations: Record<string, string>): void {
    return addLocalizedMessages(locale, translations);
  }
}

// Export singleton instance
export const errorMessageService = ErrorMessageService.getInstance();
