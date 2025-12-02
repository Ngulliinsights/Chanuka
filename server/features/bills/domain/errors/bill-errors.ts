import { BaseError  } from '@shared/core';

/**
 * Custom error classes for bill domain operations
 */
export class BillServiceError extends BaseError {
    constructor(
        public readonly code: BillErrorCode,
        message: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'BillServiceError';
    }

    static fromDomainError(error: Error, code: BillErrorCode = 'DOMAIN_ERROR'): BillServiceError {
        return new BillServiceError(code, error.message, { originalError: error });
    }
}

export type BillErrorCode =
    // Validation errors
    | 'INVALID_BILL_NUMBER'
    | 'INVALID_TITLE'
    | 'INVALID_SUMMARY'
    | 'INVALID_STATUS_TRANSITION'

    // Business rule violations
    | 'SPONSOR_NOT_FOUND'
    | 'SPONSOR_NOT_AUTHORIZED'
    | 'BILL_NUMBER_EXISTS'
    | 'BILL_NOT_ACTIVE'
    | 'USER_NOT_AUTHORIZED'
    | 'DUPLICATE_VOTE'
    | 'BILL_CANNOT_BE_MODIFIED'

    // Not found errors
    | 'BILL_NOT_FOUND'
    | 'USER_NOT_FOUND'

    // Operation failures
    | 'CREATE_FAILED'
    | 'STATUS_UPDATE_FAILED'
    | 'CONTENT_UPDATE_FAILED'
    | 'VOTE_RECORD_FAILED'
    | 'ENGAGEMENT_RECORD_FAILED'
    | 'AGGREGATE_FETCH_FAILED'
    | 'STATISTICS_FETCH_FAILED'
    | 'BILLS_FETCH_FAILED'

    // Infrastructure errors
    | 'REPOSITORY_ERROR'
    | 'NOTIFICATION_ERROR'
    | 'TRANSACTION_ERROR'
    | 'DOMAIN_ERROR';

/**
 * Error factory functions for common error scenarios
 */
export class BillErrorFactory {
    static invalidBillNumber(value: string): BillServiceError {
        return new BillServiceError(
            'INVALID_BILL_NUMBER',
            `Invalid bill number format: ${value}`,
            { providedValue: value }
        );
    }

    static invalidTitle(value: string): BillServiceError {
        return new BillServiceError(
            'INVALID_TITLE',
            `Invalid bill title: ${value}`,
            { providedValue: value }
        );
    }

    static invalidSummary(value: string): BillServiceError {
        return new BillServiceError(
            'INVALID_SUMMARY',
            `Invalid bill summary: ${value}`,
            { providedValue: value }
        );
    }

    static sponsorNotFound(sponsor_id: string): BillServiceError {
        return new BillServiceError(
            'SPONSOR_NOT_FOUND',
            `Bill sponsor not found: ${sponsor_id}`,
            { sponsor_id }
        );
    }

    static sponsorNotAuthorized(sponsor_id: string, role: string): BillServiceError {
        return new BillServiceError(
            'SPONSOR_NOT_AUTHORIZED',
            `User ${ sponsor_id } with role '${role}' is not authorized to sponsor bills`,
            { sponsor_id, role }
        );
    }

    static billNumberExists(billNumber: string): BillServiceError {
        return new BillServiceError(
            'BILL_NUMBER_EXISTS',
            `Bill number already exists: ${billNumber}`,
            { billNumber }
        );
    }

    static billNotFound(bill_id: string): BillServiceError {
        return new BillServiceError(
            'BILL_NOT_FOUND',
            `Bill not found: ${bill_id}`,
            { bill_id }
        );
    }

    static userNotAuthorized(user_id: string, action: string): BillServiceError {
        return new BillServiceError(
            'USER_NOT_AUTHORIZED',
            `User ${ user_id } is not authorized to perform action: ${action}`,
            { user_id, action }
        );
    }

    static duplicateVote(bill_id: string, user_id: string): BillServiceError {
        return new BillServiceError(
            'DUPLICATE_VOTE',
            `User ${user_id} has already voted on bill ${ bill_id }`,
            { bill_id, user_id }
        );
    }

    static billCannotBeModified(bill_id: string, status: string): BillServiceError {
        return new BillServiceError(
            'BILL_CANNOT_BE_MODIFIED',
            `Bill ${ bill_id } with status '${status}' cannot be modified`,
            { bill_id, status }
        );
    }

    static invalidStatusTransition(currentStatus: string, newStatus: string): BillServiceError {
        return new BillServiceError(
            'INVALID_STATUS_TRANSITION',
            `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
            { currentStatus, newStatus }
        );
    }
}
