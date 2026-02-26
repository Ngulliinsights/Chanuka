/**
 * Legislative Action Types
 * Discriminated unions for legislative actions following the loading.ts pattern
 */

import { BillId } from '../../core/branded';
import { BillStatus } from './bill';

// ============================================================================
// Action Payloads
// ============================================================================

/**
 * Base action payload with common fields
 */
export interface BaseLegislativeActionPayload {
  readonly billId: BillId;
  readonly timestamp: number;
  readonly initiatedBy: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Bill Introduction Payload
 */
export interface IntroduceBillPayload extends BaseLegislativeActionPayload {
  readonly billNumber: string;
  readonly title: string;
  readonly summary: string;
  readonly primarySponsorId: string;
  readonly chamber: 'house' | 'senate';
  readonly billType: 'bill' | 'resolution' | 'amendment';
}

/**
 * Committee Referral Payload
 */
export interface ReferToCommitteePayload extends BaseLegislativeActionPayload {
  readonly committeeId: string;
  readonly referralReason?: string;
  readonly expectedCompletionDate?: Date;
}

/**
 * Committee Action Payload
 */
export interface CommitteeActionPayload extends BaseLegislativeActionPayload {
  readonly committeeId: string;
  readonly actionType: 'hearing' | 'markup' | 'report' | 'discharge';
  readonly result?: string;
  readonly reportNumber?: string;
  readonly recommendations?: string;
}

/**
 * Floor Action Payload
 */
export interface FloorActionPayload extends BaseLegislativeActionPayload {
  readonly actionType: 'debate' | 'amendment' | 'vote';
  readonly chamber: 'house' | 'senate';
  readonly result?: string;
  readonly voteCount?: {
    readonly yea: number;
    readonly nay: number;
    readonly abstain: number;
    readonly present: number;
  };
  readonly amendmentText?: string;
}

/**
 * Vote Result Payload
 */
export interface VoteResultPayload extends BaseLegislativeActionPayload {
  readonly chamber: 'house' | 'senate';
  readonly voteType: 'passage' | 'procedural' | 'override';
  readonly result: 'passed' | 'failed' | 'tied';
  readonly voteBreakdown: {
    readonly yea: number;
    readonly nay: number;
    readonly abstain: number;
    readonly requiredMajority: number;
  };
  readonly rollCallUrl?: string;
}

/**
 * Presidential Action Payload
 */
export interface PresidentialActionPayload extends BaseLegislativeActionPayload {
  readonly actionType: 'sign' | 'veto' | 'pocket_veto';
  readonly result: 'enacted' | 'vetoed' | 'pocket_vetoed';
  readonly signingStatement?: string;
  readonly vetoMessage?: string;
  readonly effectiveDate?: Date;
}

/**
 * Status Update Payload
 */
export interface UpdateBillStatusPayload extends BaseLegislativeActionPayload {
  readonly newStatus: BillStatus;
  readonly previousStatus: BillStatus;
  readonly transitionReason?: string;
}

/**
 * Amendment Payload
 */
export interface AmendmentPayload extends BaseLegislativeActionPayload {
  readonly amendmentId: string;
  readonly amendmentText: string;
  readonly amendmentType: 'substitute' | 'perfecting' | 'technical';
  readonly sponsorId: string;
  readonly affectedSections: readonly string[];
}

/**
 * Conference Action Payload
 */
export interface ConferenceActionPayload extends BaseLegislativeActionPayload {
  readonly conferenceCommitteeId: string;
  readonly actionType: 'convene' | 'report' | 'dismiss';
  readonly conferenceReport?: string;
  readonly resolutionText?: string;
}

// ============================================================================
// Discriminated Union Actions
// ============================================================================

/**
 * Legislative Action - Discriminated union following loading.ts pattern
 */
export type LegislativeAction =
  | {
      type: 'INTRODUCE_BILL';
      payload: IntroduceBillPayload;
    }
  | {
      type: 'REFER_TO_COMMITTEE';
      payload: ReferToCommitteePayload;
    }
  | {
      type: 'COMMITTEE_ACTION';
      payload: CommitteeActionPayload;
    }
  | {
      type: 'FLOOR_ACTION';
      payload: FloorActionPayload;
    }
  | {
      type: 'VOTE_RESULT';
      payload: VoteResultPayload;
    }
  | {
      type: 'PRESIDENTIAL_ACTION';
      payload: PresidentialActionPayload;
    }
  | {
      type: 'UPDATE_STATUS';
      payload: UpdateBillStatusPayload;
    }
  | {
      type: 'AMENDMENT';
      payload: AmendmentPayload;
    }
  | {
      type: 'CONFERENCE_ACTION';
      payload: ConferenceActionPayload;
    };

// ============================================================================
// Action Result Types
// ============================================================================

/**
 * Base action result
 */
export interface BaseActionResult {
  readonly actionId: string;
  readonly billId: BillId;
  readonly success: boolean;
  readonly timestamp: number;
  readonly initiatedBy: string;
}

/**
 * Successful action result
 */
export interface SuccessfulActionResult extends BaseActionResult {
  readonly success: true;
  readonly resultData?: Readonly<Record<string, unknown>>;
  readonly newStatus?: BillStatus;
}

/**
 * Failed action result
 */
export interface FailedActionResult extends BaseActionResult {
  readonly success: false;
  readonly error: string;
  readonly errorCode?: string;
  readonly errorDetails?: Readonly<Record<string, unknown>>;
}

/**
 * Action Result discriminated union
 */
export type LegislativeActionResult = SuccessfulActionResult | FailedActionResult;

// ============================================================================
// Action Context
// ============================================================================

/**
 * Complete action context with metadata
 */
export interface LegislativeActionContext {
  readonly action: LegislativeAction;
  readonly result?: LegislativeActionResult;
  readonly previousState?: Readonly<Record<string, unknown>>;
  readonly nextState?: Readonly<Record<string, unknown>>;
  readonly isReversible: boolean;
  readonly reversalAction?: LegislativeAction;
}