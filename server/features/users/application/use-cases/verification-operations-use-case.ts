// Repository interfaces removed - using direct service calls
import { CitizenVerification, VerificationType } from '../../domain/entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '../../domain/entities/value-objects';
import { UserVerificationDomainService, VerificationCreationResult, VerificationUpdateResult } from '../../domain/services/user-verification-domain-service';
import { UserService } from '../user-service-direct';

export interface SubmitVerificationCommand { user_id: string;
  bill_id: number;
  verification_type: VerificationType;
  claim: string;
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
  }

export interface EndorseVerificationCommand { user_id: string;
  verification_id: string;
 }

export interface DisputeVerificationCommand { user_id: string;
  verification_id: string;
  reason: string;
 }

export interface PerformFactCheckCommand { bill_id: number;
  claim: string;
 }

export interface VerificationOperationResult {
  success: boolean;
  verification?: CitizenVerification;
  factCheckResults?: unknown[];
  errors: string[];
  warnings?: string[];
}

export class VerificationOperationsUseCase {
  constructor(
    private userService: UserService,
    private verificationDomainService: UserVerificationDomainService
  ) {}

  async submitVerification(command: SubmitVerificationCommand): Promise<VerificationOperationResult> {
    try {
      // Validate input
      const validationResult = this.validateSubmitCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Get user aggregate
      const userAggregate = await this.userService.findUserAggregateById(command.user_id);
      if (!userAggregate) {
        return {
          success: false,
          errors: ['User not found']
        };
      }

      // Check if user can verify this bill
      if (!userAggregate.canVerifyBill(command.bill_id)) {
        return {
          success: false,
          errors: ['User cannot verify this bill']
        };
      }

      // Create verification through domain service
      const creationResult: VerificationCreationResult = await this.verificationDomainService.createVerification({
        citizenId: command.user_id,
        bill_id: command.bill_id,
        verification_type: command.verification_type,
        evidence: command.evidence.map(e => ({
          type: e.type,
          source: e.source,
          url: e.url,
          credibility: e.credibility,
          relevance: e.relevance,
          description: e.description,
          datePublished: e.datePublished
        })),
        expertise: {
          domain: command.expertise.domain,
          level: command.expertise.level,
          credentials: command.expertise.credentials,
          verifiedCredentials: command.expertise.verifiedCredentials,
          reputation_score: command.expertise.reputation_score
        },
        reasoning: command.reasoning
      });

      if (!creationResult.success) {
        return {
          success: false,
          errors: creationResult.errors
        };
      }

      const verification = creationResult.verification!;

      // Log verification submission (cross-cutting concern)
      this.logVerificationActivity(command.user_id, 'verification_submitted', verification.id);

      return {
        success: true,
        verification,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Verification submission failed: ${errorMessage}`]
      };
    }
  }

  async endorseVerification(command: EndorseVerificationCommand): Promise<VerificationOperationResult> {
    try {
      // Validate input
      const validationResult = this.validateEndorseCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      const userAggregate = await this.userService.findUserAggregateById(command.user_id);
      if (!userAggregate) {
        return {
          success: false,
          errors: ['User not found']
        };
      }

      // Endorse verification through domain service
      const endorseResult = await this.verificationDomainService.endorseVerification(
        command.verification_id,
        command.user_id
      );

      if (!endorseResult.success) {
        return {
          success: false,
          errors: endorseResult.errors
        };
      }

      // Log endorsement
      this.logVerificationActivity(command.user_id, 'verification_endorsed', command.verification_id);

      return {
        success: true,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Endorsement failed: ${errorMessage}`]
      };
    }
  }

  async disputeVerification(command: DisputeVerificationCommand): Promise<VerificationOperationResult> {
    try {
      // Validate input
      const validationResult = this.validateDisputeCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      const userAggregate = await this.userService.findUserAggregateById(command.user_id);
      if (!userAggregate) {
        return {
          success: false,
          errors: ['User not found']
        };
      }

      // Dispute verification through domain service
      const disputeResult = await this.verificationDomainService.disputeVerification(
        command.verification_id,
        command.user_id,
        command.reason
      );

      if (!disputeResult.success) {
        return {
          success: false,
          errors: disputeResult.errors
        };
      }

      // Log dispute
      this.logVerificationActivity(command.user_id, 'verification_disputed', command.verification_id);

      return {
        success: true,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Dispute failed: ${errorMessage}`]
      };
    }
  }

  async performFactCheck(command: PerformFactCheckCommand): Promise<VerificationOperationResult> {
    try {
      // Validate input
      const validationResult = this.validateFactCheckCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Get bill verification statistics through domain service
      const billStats = await this.verificationDomainService.getBillVerificationStats(command.bill_id);

      // Simple fact check implementation - use aggregated statistics
      const factCheckResults = [{
        bill_id: command.bill_id,
        claim: command.claim,
        totalVerifications: billStats.totalVerifications,
        verifiedCount: billStats.verifiedCount,
        disputedCount: billStats.disputedCount,
        averageConfidence: billStats.averageConfidence,
        topContributors: billStats.topContributors.slice(0, 3) // Top 3 contributors
      }];

      // Log fact check operation
      this.logVerificationActivity('system', 'fact_check_performed', `bill_${command.bill_id}`);

      return {
        success: true,
        factCheckResults,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Fact check failed: ${errorMessage}`]
      };
    }
  }

  private validateSubmitCommand(command: SubmitVerificationCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.user_id || !command.user_id.trim()) {
      errors.push('User ID is required');
    }

    if (!command.bill_id || command.bill_id <= 0) {
      errors.push('Valid bill ID is required');
    }

    if (!command.verification_type) {
      errors.push('Verification type is required');
    }

    if (!command.claim || !command.claim.trim()) {
      errors.push('Claim is required');
    }

    if (!command.evidence || !Array.isArray(command.evidence) || command.evidence.length === 0) {
      errors.push('At least one piece of evidence is required');
    }

    if (!command.expertise) {
      errors.push('Expertise information is required');
    }

    if (!command.reasoning || command.reasoning.trim().length < 20) {
      errors.push('Reasoning must be at least 20 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateEndorseCommand(command: EndorseVerificationCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.user_id || !command.user_id.trim()) {
      errors.push('User ID is required');
    }

    if (!command.verification_id || !command.verification_id.trim()) {
      errors.push('Verification ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateDisputeCommand(command: DisputeVerificationCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.user_id || !command.user_id.trim()) {
      errors.push('User ID is required');
    }

    if (!command.verification_id || !command.verification_id.trim()) {
      errors.push('Verification ID is required');
    }

    if (!command.reason || !command.reason.trim()) {
      errors.push('Dispute reason is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateFactCheckCommand(command: PerformFactCheckCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.bill_id || command.bill_id <= 0) {
      errors.push('Valid bill ID is required');
    }

    if (!command.claim || !command.claim.trim()) {
      errors.push('Claim is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private logVerificationActivity(user_id: string, action: string, targetId: string): void {
    // This would typically use a logging service
    console.log(`Verification activity: ${action} by ${ user_id } on ${targetId}`);
  }
}








































