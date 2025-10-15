import { UserRepository } from '../../domain/repositories/user-repository';
import { VerificationRepository } from '../../domain/repositories/verification-repository';
import { VerificationDomainService, VerificationProcessingResult } from '../../domain/services/verification-domain-service';
import { CitizenVerification, VerificationType } from '../../domain/entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '../../domain/entities/value-objects';

export interface SubmitVerificationCommand {
  userId: string;
  billId: number;
  verificationType: VerificationType;
  claim: string;
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
}

export interface EndorseVerificationCommand {
  userId: string;
  verificationId: string;
}

export interface DisputeVerificationCommand {
  userId: string;
  verificationId: string;
  reason: string;
}

export interface PerformFactCheckCommand {
  billId: number;
  claim: string;
}

export interface VerificationOperationResult {
  success: boolean;
  verification?: CitizenVerification;
  factCheckResults?: any[];
  errors: string[];
  warnings?: string[];
}

export class VerificationOperationsUseCase {
  constructor(
    private userRepository: UserRepository,
    private verificationRepository: VerificationRepository,
    private verificationDomainService: VerificationDomainService
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
      const userAggregate = await this.userRepository.findUserAggregateById(command.userId);
      if (!userAggregate) {
        return {
          success: false,
          errors: ['User not found']
        };
      }

      // Process verification through domain service
      const processingResult: VerificationProcessingResult = await this.verificationDomainService.processVerification(
        command.userId,
        command.billId,
        command.verificationType,
        command.evidence,
        command.expertise,
        command.reasoning
      );

      if (!processingResult.success) {
        return {
          success: false,
          errors: processingResult.errors,
          warnings: processingResult.warnings
        };
      }

      // Check if user can verify this bill
      if (!userAggregate.canVerifyBill(command.billId)) {
        return {
          success: false,
          errors: ['User cannot verify this bill']
        };
      }

      const verification = processingResult.verification!;

      // Save verification
      await this.verificationRepository.save(verification);

      // Update user reputation based on verification confidence
      const newReputation = Math.min(100, userAggregate.reputationScore + Math.floor(verification.confidence / 10));
      userAggregate.user.updateReputationScore(newReputation);
      await this.userRepository.update(userAggregate.user);

      // Log verification submission (cross-cutting concern)
      this.logVerificationActivity(command.userId, 'verification_submitted', verification.id);

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

      const userAggregate = await this.userRepository.findUserAggregateById(command.userId);
      const verification = await this.verificationRepository.findById(command.verificationId);

      if (!userAggregate || !verification) {
        return {
          success: false,
          errors: ['User or verification not found']
        };
      }

      // Basic validation: user cannot endorse their own verification
      if (verification.citizenId === command.userId) {
        return {
          success: false,
          errors: ['Users cannot endorse their own verifications']
        };
      }

      await this.verificationRepository.addEndorsement(command.verificationId, command.userId);

      // Update verification confidence through endorsement
      verification.endorse();
      await this.verificationRepository.update(verification);

      // Log endorsement
      this.logVerificationActivity(command.userId, 'verification_endorsed', command.verificationId);

      return {
        success: true,
        verification,
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

      const userAggregate = await this.userRepository.findUserAggregateById(command.userId);
      const verification = await this.verificationRepository.findById(command.verificationId);

      if (!userAggregate || !verification) {
        return {
          success: false,
          errors: ['User or verification not found']
        };
      }

      // Basic validation: user cannot dispute their own verification
      if (verification.citizenId === command.userId) {
        return {
          success: false,
          errors: ['Users cannot dispute their own verifications']
        };
      }

      await this.verificationRepository.addDispute(command.verificationId, command.userId, command.reason);

      // Update verification confidence through dispute
      verification.dispute();

      // Check if verification should be escalated for review (simple logic)
      const consensusLevel = verification.getConsensusLevel();
      if (consensusLevel < 30) {
        verification.updateStatus('needs_review');
      }

      await this.verificationRepository.update(verification);

      // Log dispute
      this.logVerificationActivity(command.userId, 'verification_disputed', command.verificationId);

      return {
        success: true,
        verification,
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

      const relevantVerifications = await this.verificationRepository.findRelevantVerifications(
        command.billId,
        command.claim
      );

      // Simple fact check implementation - aggregate verification results
      const factCheckResults = relevantVerifications.map(verification => ({
        verificationId: verification.id,
        confidence: verification.confidence,
        consensusLevel: verification.getConsensusLevel(),
        verificationType: verification.verificationType,
        citizenId: verification.citizenId,
        reasoning: verification.reasoning
      }));

      // Log fact check operation
      this.logVerificationActivity('system', 'fact_check_performed', `bill_${command.billId}`);

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

    if (!command.userId || !command.userId.trim()) {
      errors.push('User ID is required');
    }

    if (!command.billId || command.billId <= 0) {
      errors.push('Valid bill ID is required');
    }

    if (!command.verificationType) {
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

    if (!command.userId || !command.userId.trim()) {
      errors.push('User ID is required');
    }

    if (!command.verificationId || !command.verificationId.trim()) {
      errors.push('Verification ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateDisputeCommand(command: DisputeVerificationCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.userId || !command.userId.trim()) {
      errors.push('User ID is required');
    }

    if (!command.verificationId || !command.verificationId.trim()) {
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

    if (!command.billId || command.billId <= 0) {
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

  private logVerificationActivity(userId: string, action: string, targetId: string): void {
    // This would typically use a logging service
    console.log(`Verification activity: ${action} by ${userId} on ${targetId}`);
  }
}