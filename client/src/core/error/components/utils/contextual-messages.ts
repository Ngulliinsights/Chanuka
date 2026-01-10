/**
 * Contextual Message Generator
 * Extracted from ErrorFallback.tsx to reduce file size and improve reusability
 */

import type { AppError } from '../../types';
import { BaseError } from '../../classes';
import { ErrorDomain } from '../../constants';

export function getContextualMessage(
  error: BaseError,
  errorType?: string,
  context?: string
): string {
  if (errorType === 'chunk') {
    return 'Failed to load part of the application. This usually happens after an app update. Try refreshing the page or clearing your browser cache.';
  }

  if (errorType === 'network') {
    return 'There was a problem connecting to our services. Please check your internet connection and try again.';
  }

  if (errorType === 'timeout') {
    return 'The operation took too long to complete. This might indicate a slow connection or server overload. Please try again.';
  }

  if (errorType === 'memory') {
    return 'The application is using too much memory. Try closing other tabs or restarting your browser.';
  }

  if (errorType === 'security') {
    return 'A security restriction prevented the operation from completing. This is a protective measure to keep your data safe.';
  }

  const domain = (error.metadata?.domain as ErrorDomain | undefined) || ErrorDomain.UNKNOWN;

  switch (domain) {
    case ErrorDomain.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection.';

    case ErrorDomain.AUTHENTICATION:
      return 'Your session has expired or you are not logged in. Please sign in again to continue.';

    case ErrorDomain.AUTHORIZATION:
      return 'You do not have permission to perform this action. Contact your administrator if you believe this is incorrect.';

    case ErrorDomain.VALIDATION:
      return 'The information provided is invalid. Please check your input and try again.';

    case ErrorDomain.DATABASE:
      return 'There was a problem accessing the database. Please try again in a few moments.';

    case ErrorDomain.EXTERNAL_SERVICE:
      return 'An external service is temporarily unavailable. We are working to restore it.';

    case ErrorDomain.BUSINESS_LOGIC:
      return 'This operation cannot be completed due to business rules or constraints.';

    case ErrorDomain.CACHE:
      return 'There was a problem with cached data. Try refreshing to load fresh data.';

    default:
      switch (context) {
        case 'page':
          return 'This page encountered an error and cannot be displayed.';
        case 'component':
          return 'A component on this page failed to load properly.';
        case 'api':
          return 'There was a problem communicating with the server.';
        case 'navigation':
          return 'Navigation failed. Please try refreshing the page.';
        case 'authentication':
          return 'Authentication failed. Please try logging in again.';
        case 'data-loading':
          return 'Failed to load data. Please check your connection and try again.';
        default:
          return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
      }
  }
}
