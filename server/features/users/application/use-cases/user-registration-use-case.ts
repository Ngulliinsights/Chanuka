import { UserRepository } from '../../domain/repositories/user-repository';
import { UserManagementDomainService, UserCreationResult } from '../../domain/services/user-management-domain-service';
import { User } from '../../domain/entities/user';

export interface RegisterUserCommand {
  email: string;
  name: string;
  passwordHash: string;
  role?: string;
}

export interface RegisterUserResult {
  success: boolean;
  user?: User;
  errors: string[];
}

export class UserRegistrationUseCase {
  constructor(
    private userRepository: UserRepository,
    private userManagementService: UserManagementDomainService
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    try {
      // Validate input
      const validationResult = this.validateCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Create user through domain service
      const result: UserCreationResult = await this.userManagementService.createUser({
        email: command.email,
        name: command.name,
        passwordHash: command.passwordHash,
        role: command.role || 'citizen'
      });

      if (!result.success) {
        return {
          success: false,
          errors: result.errors
        };
      }

      // Log successful registration (cross-cutting concern)
      this.logUserRegistration(result.user!.id, command.email);

      return {
        success: true,
        user: result.user,
        errors: []
      };
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Registration failed: ${errorMessage}`]
      };
    }
  }

  private validateCommand(command: RegisterUserCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.email || !command.email.trim()) {
      errors.push('Email is required');
    }

    if (!command.name || !command.name.trim()) {
      errors.push('Name is required');
    }

    if (!command.passwordHash || command.passwordHash.length < 60) {
      errors.push('Valid password hash is required');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (command.email && !emailRegex.test(command.email)) {
      errors.push('Invalid email format');
    }

    // Name length validation
    if (command.name && command.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (command.name && command.name.trim().length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private logUserRegistration(userId: string, email: string): void {
    // This would typically use a logging service
    console.log(`User registered: ${userId} (${email})`);
  }
}




































