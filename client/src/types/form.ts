export type FormState<T = Record<string, any>> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
  initialValues: T;
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
  fieldErrors: Record<string, string[]>;
}

export interface FormFieldProps<T = any> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  onBlur: () => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  helpText?: string;
  className?: string;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface FormSubmission<T = Record<string, any>> {
  id: string;
  data: T;
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  errors?: Record<string, string>;
  response?: any;
  duration?: number;
  retryCount: number;
  userId?: string;
  sessionId: string;
}

export interface FormConfig<T = Record<string, any>> {
  id: string;
  name: string;
  fields: FormFieldConfig[];
  validation: ValidationConfig;
  submission: SubmissionConfig;
  initialValues: T;
  enableReinitialize?: boolean;
  destroyOnUnmount?: boolean;
  keepDirtyOnReinitialize?: boolean;
}

export interface FormFieldConfig {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'datetime-local' | 'custom';
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  validation?: FieldValidation[];
  options?: FieldOption[];
  dependencies?: string[];
  conditional?: FieldCondition;
  layout?: FieldLayout;
  props?: Record<string, any>;
}

export interface FieldValidation {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  async?: boolean;
}

export interface FieldOption {
  label: string;
  value: any;
  disabled?: boolean;
  group?: string;
}

export interface FieldCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: any;
}

export interface FieldLayout {
  width?: number;
  offset?: number;
  order?: number;
  className?: string;
}

export interface ValidationConfig {
  mode: 'onChange' | 'onBlur' | 'onSubmit';
  debounce?: number;
  validateOnMount?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  exitOnFirstError?: boolean;
}

export interface SubmissionConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  transformRequest?: (data: any) => any;
  transformResponse?: (response: any) => any;
}

export interface FormContextValue<T = Record<string, any>> {
  state: FormState<T>;
  config: FormConfig<T>;
  setValue: (name: string, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (name: string, error: string | undefined) => void;
  setTouched: (name: string, touched: boolean) => void;
  setFieldTouched: (name: string, touched?: boolean) => void;
  validateField: (name: string) => Promise<void>;
  validateForm: () => Promise<ValidationResult>;
  resetForm: (values?: Partial<T>) => void;
  submitForm: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
  getFieldProps: (name: string) => FormFieldProps;
  getFieldMeta: (name: string) => {
    value: any;
    error?: string;
    touched?: boolean;
  };
}

export interface FormArrayHelpers {
  push: (value: any) => void;
  insert: (index: number, value: any) => void;
  remove: (index: number) => void;
  swap: (indexA: number, indexB: number) => void;
  move: (from: number, to: number) => void;
  replace: (index: number, value: any) => void;
  unshift: (value: any) => void;
  pop: () => void;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  validation?: ValidationConfig;
  canProceed?: (values: Record<string, any>) => boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface MultiStepFormState extends FormState {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface FormWizardConfig extends FormConfig {
  steps: FormStep[];
  allowSkip?: boolean;
  showProgress?: boolean;
  persistProgress?: boolean;
}

export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
  params?: Record<string, any>;
}

export interface FormValidationError extends Error {
  name: 'ValidationError';
  errors: FormFieldError[];
  fields: Record<string, FormFieldError[]>;
}

export interface FormSubmissionError extends Error {
  name: 'SubmissionError';
  status?: number;
  response?: any;
  fields?: Record<string, string>;
}