/**
 * Authentication Component Types
 * Type definitions for authentication forms and components
 */

export interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  remember_me: boolean;
  two_factor_code: string;
}

export type FormFieldName = keyof FormData;

export type AuthMode = 'login' | 'register';

export interface AuthFormProps {
  initialMode?: AuthMode;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onModeChange?: (mode: AuthMode) => void;
  className?: string;
}

export interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (backupCodes: string[]) => void;
}

export interface SocialLoginProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface SecurityDashboardProps {
  className?: string;
}

export interface PrivacyControlsProps {
  className?: string;
}