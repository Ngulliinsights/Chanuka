// ============================================================================
// ADVOCACY COORDINATION - Domain Errors
// ============================================================================

export class AdvocacyDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AdvocacyDomainError';
  }
}

// Campaign Errors
export class CampaignNotFoundError extends AdvocacyDomainError {
  constructor(campaign_id: string) {
    super(`Campaign with ID ${campaign_id} not found`, 'CAMPAIGN_NOT_FOUND', 404);
  }
}

export class CampaignAccessDeniedError extends AdvocacyDomainError {
  constructor(campaign_id: string, user_id: string) {
    super(`User ${user_id} does not have access to campaign ${campaign_id}`, 'CAMPAIGN_ACCESS_DENIED', 403);
  }
}

export class CampaignStatusError extends AdvocacyDomainError {
  constructor(currentStatus: string, attemptedAction: string) {
    super(`Cannot ${attemptedAction} campaign in ${currentStatus} status`, 'INVALID_CAMPAIGN_STATUS', 400);
  }
}

export class CampaignCapacityError extends AdvocacyDomainError {
  constructor(campaign_id: string) {
    super(`Campaign ${campaign_id} has reached maximum participant capacity`, 'CAMPAIGN_CAPACITY_EXCEEDED', 400);
  }
}

export class DuplicateCampaignError extends AdvocacyDomainError {
  constructor(bill_id: string, organizerId: string) {
    super(`User ${organizerId} already has an active campaign for bill ${bill_id}`, 'DUPLICATE_CAMPAIGN', 409);
  }
}

export class CampaignValidationError extends AdvocacyDomainError {
  constructor(field: string, reason: string) {
    super(`Campaign validation failed for ${field}: ${reason}`, 'CAMPAIGN_VALIDATION_ERROR', 400);
  }
}

// Action Errors
export class ActionNotFoundError extends AdvocacyDomainError {
  constructor(actionId: string) {
    super(`Action with ID ${actionId} not found`, 'ACTION_NOT_FOUND', 404);
  }
}

export class ActionStatusError extends AdvocacyDomainError {
  constructor(currentStatus: string, attemptedAction: string) {
    super(`Cannot ${attemptedAction} action in ${currentStatus} status`, 'INVALID_ACTION_STATUS', 400);
  }
}

export class ActionAssignmentError extends AdvocacyDomainError {
  constructor(actionId: string, user_id: string) {
    super(`Action ${actionId} is not assigned to user ${user_id}`, 'ACTION_ASSIGNMENT_ERROR', 403);
  }
}

export class ActionDeadlineError extends AdvocacyDomainError {
  constructor(actionId: string) {
    super(`Action ${actionId} has passed its deadline`, 'ACTION_DEADLINE_PASSED', 400);
  }
}

export class ActionValidationError extends AdvocacyDomainError {
  constructor(field: string, reason: string) {
    super(`Action validation failed for ${field}: ${reason}`, 'ACTION_VALIDATION_ERROR', 400);
  }
}

// Participation Errors
export class ParticipationError extends AdvocacyDomainError {
  constructor(message: string) {
    super(message, 'PARTICIPATION_ERROR', 400);
  }
}

export class AlreadyParticipatingError extends AdvocacyDomainError {
  constructor(campaign_id: string, user_id: string) {
    super(`User ${user_id} is already participating in campaign ${campaign_id}`, 'ALREADY_PARTICIPATING', 409);
  }
}

export class NotParticipatingError extends AdvocacyDomainError {
  constructor(campaign_id: string, user_id: string) {
    super(`User ${user_id} is not participating in campaign ${campaign_id}`, 'NOT_PARTICIPATING', 400);
  }
}

export class OrganizerCannotLeaveError extends AdvocacyDomainError {
  constructor(campaign_id: string) {
    super(`Campaign organizer cannot leave campaign ${campaign_id}`, 'ORGANIZER_CANNOT_LEAVE', 400);
  }
}

// Coalition Errors
export class CoalitionError extends AdvocacyDomainError {
  constructor(message: string) {
    super(message, 'COALITION_ERROR', 400);
  }
}

export class IncompatibleCampaignsError extends AdvocacyDomainError {
  constructor(campaignId1: string, campaignId2: string) {
    super(`Campaigns ${campaignId1} and ${campaignId2} are not compatible for coalition`, 'INCOMPATIBLE_CAMPAIGNS', 400);
  }
}

// Template Errors
export class TemplateNotFoundError extends AdvocacyDomainError {
  constructor(templateId: string) {
    super(`Template with ID ${templateId} not found`, 'TEMPLATE_NOT_FOUND', 404);
  }
}

export class TemplateValidationError extends AdvocacyDomainError {
  constructor(field: string, reason: string) {
    super(`Template validation failed for ${field}: ${reason}`, 'TEMPLATE_VALIDATION_ERROR', 400);
  }
}

// Authorization Errors
export class UnauthorizedActionError extends AdvocacyDomainError {
  constructor(action: string, resource: string) {
    super(`Unauthorized to ${action} ${resource}`, 'UNAUTHORIZED_ACTION', 403);
  }
}

export class InsufficientPermissionsError extends AdvocacyDomainError {
  constructor(requiredPermission: string) {
    super(`Insufficient permissions: ${requiredPermission} required`, 'INSUFFICIENT_PERMISSIONS', 403);
  }
}

// Data Errors
export class DataIntegrityError extends AdvocacyDomainError {
  constructor(message: string) {
    super(`Data integrity violation: ${message}`, 'DATA_INTEGRITY_ERROR', 500);
  }
}

export class ConcurrencyError extends AdvocacyDomainError {
  constructor(resource: string) {
    super(`Concurrent modification detected for ${resource}`, 'CONCURRENCY_ERROR', 409);
  }
}

// External Service Errors
export class ExternalServiceError extends AdvocacyDomainError {
  constructor(service: string, operation: string) {
    super(`External service ${service} failed during ${operation}`, 'EXTERNAL_SERVICE_ERROR', 502);
  }
}

export class NotificationError extends AdvocacyDomainError {
  constructor(type: string, recipient: string) {
    super(`Failed to send ${type} notification to ${recipient}`, 'NOTIFICATION_ERROR', 500);
  }
}

// Rate Limiting Errors
export class RateLimitError extends AdvocacyDomainError {
  constructor(action: string, limit: string) {
    super(`Rate limit exceeded for ${action}: ${limit}`, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

// Utility function to check if error is an advocacy domain error
export function isAdvocacyDomainError(error: unknown): error is AdvocacyDomainError {
  return error instanceof AdvocacyDomainError;
}

// Error factory functions
export const AdvocacyErrors = {
  campaignNotFound: (id: string) => new CampaignNotFoundError(id),
  campaignAccessDenied: (campaign_id: string, user_id: string) => new CampaignAccessDeniedError(campaign_id, user_id),
  campaignStatus: (status: string, action: string) => new CampaignStatusError(status, action),
  campaignCapacity: (id: string) => new CampaignCapacityError(id),
  duplicateCampaign: (bill_id: string, organizerId: string) => new DuplicateCampaignError(bill_id, organizerId),
  campaignValidation: (field: string, reason: string) => new CampaignValidationError(field, reason),
  
  actionNotFound: (id: string) => new ActionNotFoundError(id),
  actionStatus: (status: string, action: string) => new ActionStatusError(status, action),
  actionAssignment: (actionId: string, user_id: string) => new ActionAssignmentError(actionId, user_id),
  actionDeadline: (id: string) => new ActionDeadlineError(id),
  actionValidation: (field: string, reason: string) => new ActionValidationError(field, reason),
  
  alreadyParticipating: (campaign_id: string, user_id: string) => new AlreadyParticipatingError(campaign_id, user_id),
  notParticipating: (campaign_id: string, user_id: string) => new NotParticipatingError(campaign_id, user_id),
  organizerCannotLeave: (campaign_id: string) => new OrganizerCannotLeaveError(campaign_id),
  
  templateNotFound: (id: string) => new TemplateNotFoundError(id),
  templateValidation: (field: string, reason: string) => new TemplateValidationError(field, reason),
  
  unauthorizedAction: (action: string, resource: string) => new UnauthorizedActionError(action, resource),
  insufficientPermissions: (permission: string) => new InsufficientPermissionsError(permission),
  
  dataIntegrity: (message: string) => new DataIntegrityError(message),
  concurrency: (resource: string) => new ConcurrencyError(resource),
  
  externalService: (service: string, operation: string) => new ExternalServiceError(service, operation),
  notification: (type: string, recipient: string) => new NotificationError(type, recipient),
  
  rateLimit: (action: string, limit: string) => new RateLimitError(action, limit)
};


