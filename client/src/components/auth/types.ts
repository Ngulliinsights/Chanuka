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

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

export interface RegisterFormProps {
  className?: string;
  onSubmit?: (data: Omit<RegisterFormData, 'confirmPassword'>) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
}

export interface LoginFormProps {
  className?: string;
  onSubmit?: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
}

export interface UseAuthFormOptions {
  initialMode?: 'login' | 'register';
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onModeChange?: (mode: 'login' | 'register') => void;
  realTimeValidation?: boolean;
}

export interface UseAuthFormReturn {
  mode: 'login' | 'register';
  formData: FormData;
  errors: Partial<Record<FormFieldName, string>>;
  loading: boolean;
  apiResponse: { success?: string; error?: string } | null;
  showPassword: boolean;
  isRegisterMode: boolean;
  isValid: boolean;
  canSubmit: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  toggleMode: () => void;
  setShowPassword: (show: boolean) => void;
  clearErrors: () => void;
  resetForm: () => void;
  getFieldError: (field: FormFieldName) => string | undefined;
  getFieldProps: (field: FormFieldName) => {
    name: string;
    value: string | boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    error: string | undefined;
    disabled: boolean;
    required: boolean;
  };
  validateField: (name: FormFieldName, value: string | boolean) => string | undefined;
  retry: () => void;
}