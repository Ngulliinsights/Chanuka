/**
 * Auth component type definitions
 */

export type AuthMode = 'login' | 'register';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type FormData = LoginFormData | RegisterFormData;

// Helper type for all possible form field names
export type FormFieldName = keyof LoginFormData | keyof RegisterFormData;

export interface ValidationErrors {
  [key: string]: string;
}

export interface AuthFormProps {
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export interface AuthInputProps {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  showPasswordToggle?: boolean;
  className?: string;
}

export interface AuthButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: any;
  requiresVerification?: boolean;
}

export interface UseAuthFormResult {
  // State
  mode: AuthMode;
  formData: FormData;
  errors: ValidationErrors;
  loading: boolean;
  isLoading: boolean; // Alias for loading
  apiResponse: { success?: string; error?: string } | null;
  isValid: boolean;
  attemptCount: number;
  recoveryStrategy: any;
  recovery: any; // Recovery actions
  showPassword: boolean;
  actions: any; // Form actions
  
  // Actions
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  toggleMode: () => void;
  resetForm: () => void;
  validateField: (fieldName: string, value: string) => void;
  setShowPassword: (show: boolean) => void;
  
  // Recovery actions
  retry: () => void;
  
  // Utility getters
  getFieldError: (fieldName: string) => string | undefined;
  hasError: (fieldName: string) => boolean;
  canSubmit: boolean;
  
  // Mode-specific helpers
  isLoginMode: boolean;
  isRegisterMode: boolean;
  
  // Field helpers
  getFieldProps: (fieldName: string) => {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    error?: string;
    disabled: boolean;
    required: boolean;
  };
  
  // Config
  config: AuthConfig;
}

export interface AuthConfig {
  // Validation settings
  validation: {
    enabled: boolean;
    strict: boolean;
    realTimeValidation: boolean;
  };
  
  // Password requirements
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  
  // UI settings
  ui: {
    showPasswordRequirements: boolean;
    enablePasswordToggle: boolean;
    autoFocusFirstField: boolean;
  };
  
  // Security settings
  security: {
    sanitizeInput: boolean;
    maxAttempts: number;
    lockoutDuration: number;
  };
}

// Additional missing types
export interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginFormProps extends AuthFormProps {
  mode: 'login';
  onSubmit?: (data: LoginFormData) => Promise<{ success?: string; error?: string }>;
  loading?: boolean;
  error?: string;
}

export interface RegisterFormProps extends AuthFormProps {
  mode: 'register';
  onSubmit?: (data: RegisterFormData) => Promise<{ success?: string; error?: string }>;
  loading?: boolean;
  error?: string;
}

// Union type for form data to handle both login and register
export type AuthFormData = LoginFormData | RegisterFormData;

