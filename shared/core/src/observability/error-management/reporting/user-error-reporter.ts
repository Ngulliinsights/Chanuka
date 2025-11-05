/**
 * User-Facing Error Reporting with Feedback Collection
 *
 * Provides comprehensive error reporting for end users with feedback collection,
 * recovery suggestions, and integration with support systems.
 */

import { BaseError, ErrorSeverity } from '../errors/base-error.js';
import { logger } from '../../logging/index.js';
import {
  UserErrorReport,
  UserFeedback,
  RecoveryOption,
  ErrorContext
} from '../types.js';

export interface UserErrorReporterConfig {
  enableFeedback: boolean;
  enableTechnicalDetails: boolean;
  maxReportsPerUser: number;
  reportRetentionDays: number;
  feedbackStorage?: {
    save(feedback: UserFeedback): Promise<void>;
    get(errorId: string): Promise<UserFeedback | null>;
  };
}

export interface ErrorReportSubmission { errorId: string;
  userMessage: string;
  technicalDetails?: string;
  recoveryOptions: RecoveryOption[];
  user_id?: string;
  session_id?: string;
  user_agent?: string;
  url?: string;
 }

export class UserErrorReporter {
  private reports: Map<string, UserErrorReport> = new Map();
  private config: UserErrorReporterConfig;

  constructor(config: Partial<UserErrorReporterConfig> = {}) {
    this.config = {
      enableFeedback: config.enableFeedback ?? true,
      enableTechnicalDetails: config.enableTechnicalDetails ?? false,
      maxReportsPerUser: config.maxReportsPerUser ?? 10,
      reportRetentionDays: config.reportRetentionDays ?? 30,
      feedbackStorage: config.feedbackStorage
    };
  }

  /**
   * Generate a user-friendly error report
   */
  generateReport(
    error: BaseError,
    context: ErrorContext = {},
    recoveryOptions: RecoveryOption[] = []
  ): UserErrorReport { const errorId = error.errorId;
    const userMessage = this.generateUserMessage(error);
    const technicalDetails = this.config.enableTechnicalDetails
      ? this.generateTechnicalDetails(error)
      : undefined;

    const report: UserErrorReport = {
      errorId,
      userMessage,
      technicalDetails,
      recoveryOptions,
      timestamp: new Date(),
      user_id: context.user_id,
      session_id: context.session_id
     };

    // Store the report
    this.reports.set(errorId, report);

    // Clean up old reports periodically
    this.cleanupOldReports();

    logger.info('Generated user error report', { component: 'UserErrorReporter',
      errorId,
      user_id: context.user_id,
      session_id: context.session_id
     });

    return report;
  }

  /**
   * Submit user feedback for an error report
   */
  async submitFeedback(
    errorId: string,
    feedback: Partial<UserFeedback>
  ): Promise<void> {
    if (!this.config.enableFeedback) {
      throw new Error('Feedback collection is disabled');
    }

    const report = this.reports.get(errorId);
    if (!report) {
      throw new Error(`Error report not found: ${errorId}`);
    }

    const userFeedback: UserFeedback = {
      rating: feedback.rating,
      comment: feedback.comment,
      contactInfo: feedback.contactInfo,
      timestamp: new Date()
    };

    report.feedback = userFeedback;

    // Store feedback if storage is configured
    if (this.config.feedbackStorage) {
      try {
        await this.config.feedbackStorage.save(userFeedback);
      } catch (error) {
        logger.error('Failed to store user feedback', {
          component: 'UserErrorReporter',
          errorId,
          error
        });
      }
    }

    logger.info('User feedback submitted', {
      component: 'UserErrorReporter',
      errorId,
      rating: feedback.rating,
      hasComment: !!feedback.comment
    });
  }

  /**
   * Get an error report by ID
   */
  getReport(errorId: string): UserErrorReport | null {
    return this.reports.get(errorId) || null;
  }

  /**
   * Get all reports for a user
   */
  getReportsForUser(user_id: string): UserErrorReport[] { return Array.from(this.reports.values())
      .filter(report => report.user_id === user_id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
   }

  /**
   * Get recent reports
   */
  getRecentReports(limit: number = 50): UserErrorReport[] {
    return Array.from(this.reports.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Generate recovery options for an error
   */
  generateRecoveryOptions(error: BaseError): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    // Add automatic recovery options from error metadata
    if (error.metadata.recoveryStrategies) {
      error.metadata.recoveryStrategies.forEach((strategy, index) => {
        options.push({
          id: `strategy_${index}`,
          label: strategy.name,
          description: strategy.description,
          action: strategy.action || (() => Promise.resolve()),
          automatic: strategy.automatic,
          priority: index + 1
        });
      });
    }

    // Add common recovery options based on error type
    switch (error.metadata.domain) {
      case 'network':
        options.push({
          id: 'retry_connection',
          label: 'Retry Connection',
          description: 'Attempt to reconnect and retry the operation',
          action: () => Promise.resolve(),
          automatic: false,
          priority: 1
        });
        break;

      case 'authentication':
        options.push({
          id: 'relogin',
          label: 'Re-login',
          description: 'Log out and log back in to refresh your session',
          action: () => Promise.resolve(),
          automatic: false,
          priority: 1
        });
        break;

      case 'validation':
        options.push({
          id: 'fix_input',
          label: 'Review Input',
          description: 'Please check your input and try again',
          action: () => Promise.resolve(),
          automatic: false,
          priority: 1
        });
        break;

      default:
        options.push({
          id: 'reload_page',
          label: 'Reload Page',
          description: 'Refresh the page to try again',
          action: () => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
            return Promise.resolve();
          },
          automatic: false,
          priority: 2
        });
    }

    // Add contact support option
    options.push({
      id: 'contact_support',
      label: 'Contact Support',
      description: 'Get help from our support team',
      action: () => Promise.resolve(),
      automatic: false,
      priority: 10
    });

    return options.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Export reports for analysis
   */
  exportReports(): ErrorReportSubmission[] { return Array.from(this.reports.values()).map(report => ({
      errorId: report.errorId,
      userMessage: report.userMessage,
      technicalDetails: report.technicalDetails,
      recoveryOptions: report.recoveryOptions || [],
      user_id: report.user_id,
      session_id: report.session_id
     }));
  }

  /**
   * Clear old reports based on retention policy
   */
  private cleanupOldReports(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.reportRetentionDays);

    for (const [errorId, report] of Array.from(this.reports.entries())) {
      if (report.timestamp < cutoffDate) {
        this.reports.delete(errorId);
      }
    }
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(error: BaseError): string {
    // Use the error's built-in user message if available
    if (error.getUserMessage() !== error.message) {
      return error.getUserMessage();
    }

    // Generate based on error type and severity
    switch (error.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        return 'A critical error occurred. Our team has been notified and is working on a fix.';

      case ErrorSeverity.HIGH:
        return 'Something went wrong. Please try again or contact support if the problem persists.';

      case ErrorSeverity.MEDIUM:
        return 'An error occurred while processing your request. Please try again.';

      default:
        return 'A minor issue occurred. You can continue using the application.';
    }
  }

  /**
   * Generate technical details for debugging
   */
  private generateTechnicalDetails(error: BaseError): string {
    const details = [
      `Error ID: ${error.errorId}`,
      `Code: ${error.code}`,
      `Domain: ${error.metadata.domain}`,
      `Severity: ${error.metadata.severity}`,
      `Timestamp: ${error.metadata.timestamp.toISOString()}`,
      `Source: ${error.metadata.source}`,
      `Correlation ID: ${error.metadata.correlationId || 'N/A'}`
    ];

    if (error.metadata.context) {
      details.push(`Context: ${JSON.stringify(error.metadata.context, null, 2)}`);
    }

    if (error.stack) {
      details.push(`Stack Trace:\n${error.stack}`);
    }

    return details.join('\n\n');
  }
}

/**
 * Create a new user error reporter instance
 */
export function createUserErrorReporter(
  config?: Partial<UserErrorReporterConfig>
): UserErrorReporter {
  return new UserErrorReporter(config);
}
