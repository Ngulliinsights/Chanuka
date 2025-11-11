/**
 * Error Reporter Utility
 * Extracted from ErrorFallback.tsx to reduce file size and improve reusability
 */

import { BaseError, ErrorSeverity, ErrorDomain } from '../../../shared/errors';
import { logger } from '../../../utils/logger';

export interface RecoveryStrategy {
  name: string;
  description: string;
  automatic: boolean;
}

export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  userMessage: string;
  code: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  context?: any;
  technicalDetails?: string;
  recoveryOptions: Array<{ label: string; action: string; description?: string }>;
}

export interface FeedbackSubmission {
  errorId: string;
  comment: string;
  rating: number;
  userContext?: Record<string, any>;
}

export function createErrorReporter(options: { 
  enableFeedback?: boolean; 
  enableTechnicalDetails?: boolean;
}) {
  return {
    report: (error: any) => {
      logger.error('User error reported', { 
        component: 'ErrorReporter',
        error 
      });
    },
    
    generateReport: (error: BaseError, metadata?: any): ErrorReport => {
      const errorId = (error as any).errorId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      let recoveryOptions: Array<{ label: string; action: string; description?: string }>;
      
      const recoveryStrategies = error.metadata?.recoveryStrategies as RecoveryStrategy[] | undefined;
      
      if (recoveryStrategies && recoveryStrategies.length > 0) {
        recoveryOptions = recoveryStrategies.map(strategy => ({
          label: strategy.name,
          action: strategy.automatic ? 'auto' : 'manual',
          description: strategy.description
        }));
      } else {
        recoveryOptions = [
          { label: 'Retry', action: 'retry', description: 'Attempt the operation again' },
          { label: 'Go Home', action: 'home', description: 'Return to the homepage' },
          { label: 'Report Issue', action: 'report', description: 'Send error details to support' }
        ];
        
        const errorDomain = error.metadata?.domain as ErrorDomain | undefined;
        if (errorDomain === ErrorDomain.NETWORK) {
          recoveryOptions.unshift({ 
            label: 'Check Connection', 
            action: 'check-connection',
            description: 'Verify your internet connection status'
          });
        }
      }

      const errorDomain = (error.metadata?.domain as ErrorDomain | undefined) || ErrorDomain.UNKNOWN;
      const errorSeverity = (error.metadata?.severity as ErrorSeverity | undefined) || ErrorSeverity.MEDIUM;

      return {
        id: errorId,
        timestamp: error.metadata?.timestamp?.toISOString() || new Date().toISOString(),
        message: error.message,
        userMessage: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        domain: errorDomain,
        severity: errorSeverity,
        context: error.metadata?.context || {},
        technicalDetails: options.enableTechnicalDetails ? error.stack : undefined,
        recoveryOptions
      };
    },
    
    submitFeedback: async (feedback: FeedbackSubmission): Promise<void> => {
      logger.info('User feedback submitted', { 
        component: 'ErrorReporter',
        ...feedback 
      });
    },
    
    options
  };
}