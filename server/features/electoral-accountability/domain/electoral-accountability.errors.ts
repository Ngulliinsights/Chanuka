/**
 * Electoral Accountability Errors
 * 
 * Structured error types for better error handling and debugging
 */

export class ElectoralAccountabilityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ElectoralAccountabilityError';
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends ElectoralAccountabilityError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class InvalidVoteError extends ValidationError {
  constructor(vote: string, allowedVotes: readonly string[]) {
    super(
      `Invalid vote value: ${vote}. Allowed values: ${allowedVotes.join(', ')}`,
      { vote, allowedVotes }
    );
    this.name = 'InvalidVoteError';
  }
}

export class InvalidSentimentScoreError extends ValidationError {
  constructor(score: number, min: number, max: number) {
    super(
      `Sentiment score ${score} is out of range. Must be between ${min} and ${max}`,
      { score, min, max }
    );
    this.name = 'InvalidSentimentScoreError';
  }
}

export class InvalidDateRangeError extends ValidationError {
  constructor(startDate: Date, endDate: Date) {
    super(
      `Invalid date range: start date ${startDate.toISOString()} is after end date ${endDate.toISOString()}`,
      { startDate, endDate }
    );
    this.name = 'InvalidDateRangeError';
  }
}

// ============================================================================
// NOT FOUND ERRORS
// ============================================================================

export class NotFoundError extends ElectoralAccountabilityError {
  constructor(resource: string, identifier: string | Record<string, any>) {
    super(
      `${resource} not found`,
      'NOT_FOUND',
      404,
      typeof identifier === 'string' ? { id: identifier } : identifier
    );
    this.name = 'NotFoundError';
  }
}

export class VotingRecordNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Voting record', id);
    this.name = 'VotingRecordNotFoundError';
  }
}

export class SentimentNotFoundError extends NotFoundError {
  constructor(billId: string, constituency: string) {
    super('Constituency sentiment', { billId, constituency });
    this.name = 'SentimentNotFoundError';
  }
}

export class GapAnalysisNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Gap analysis', id);
    this.name = 'GapAnalysisNotFoundError';
  }
}

export class CampaignNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Electoral pressure campaign', id);
    this.name = 'CampaignNotFoundError';
  }
}

// ============================================================================
// CONFLICT ERRORS
// ============================================================================

export class ConflictError extends ElectoralAccountabilityError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFLICT', 409, context);
    this.name = 'ConflictError';
  }
}

export class DuplicateVotingRecordError extends ConflictError {
  constructor(billId: string, sponsorId: string, voteDate: Date) {
    super(
      'Voting record already exists for this bill, sponsor, and date',
      { billId, sponsorId, voteDate }
    );
    this.name = 'DuplicateVotingRecordError';
  }
}

export class DuplicateGapAnalysisError extends ConflictError {
  constructor(votingRecordId: string, sentimentId: string) {
    super(
      'Gap analysis already exists for this voting record and sentiment',
      { votingRecordId, sentimentId }
    );
    this.name = 'DuplicateGapAnalysisError';
  }
}

// ============================================================================
// BUSINESS LOGIC ERRORS
// ============================================================================

export class BusinessLogicError extends ElectoralAccountabilityError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, context);
    this.name = 'BusinessLogicError';
  }
}

export class InsufficientSampleSizeError extends BusinessLogicError {
  constructor(sampleSize: number, required: number) {
    super(
      `Insufficient sample size: ${sampleSize}. Minimum required: ${required}`,
      { sampleSize, required }
    );
    this.name = 'InsufficientSampleSizeError';
  }
}

export class NoSentimentDataError extends BusinessLogicError {
  constructor(billId: string, constituency: string) {
    super(
      'Cannot calculate gap: no sentiment data available for this bill and constituency',
      { billId, constituency }
    );
    this.name = 'NoSentimentDataError';
  }
}

// ============================================================================
// IMPORT ERRORS
// ============================================================================

export class ImportError extends ElectoralAccountabilityError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'IMPORT_ERROR', 400, context);
    this.name = 'ImportError';
  }
}

export class CSVParseError extends ImportError {
  constructor(line: number, error: string) {
    super(
      `Failed to parse CSV at line ${line}: ${error}`,
      { line, error }
    );
    this.name = 'CSVParseError';
  }
}

export class JSONParseError extends ImportError {
  constructor(record: number, error: string) {
    super(
      `Failed to parse JSON record ${record}: ${error}`,
      { record, error }
    );
    this.name = 'JSONParseError';
  }
}

// ============================================================================
// AUTHORIZATION ERRORS
// ============================================================================

export class AuthorizationError extends ElectoralAccountabilityError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

export class InsufficientPermissionsError extends AuthorizationError {
  constructor(requiredRole: string, userRole: string) {
    super(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole}`,
      { requiredRole, userRole }
    );
    this.name = 'InsufficientPermissionsError';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isElectoralAccountabilityError(error: unknown): error is ElectoralAccountabilityError {
  return error instanceof ElectoralAccountabilityError;
}

export function getErrorResponse(error: unknown): {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  context?: Record<string, any>;
} {
  if (isElectoralAccountabilityError(error)) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}
