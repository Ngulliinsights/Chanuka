/**
 * Form Builder Module
 *
 * FSD-structured form builder with hooks, services, components, and utilities
 */

// Types
export type {
  FormBuilderOptions,
  FormBuilderReturn,
  FormValidationContext,
  FormSubmissionResult,
  FormFieldConfig,
  FormConfig,
  FormBuilderService,
  FormBuilderFactoryConfig,
} from './types/form-builder.types';

// Hooks
export { useFormBuilder, useDynamicForm } from './hooks/useFormBuilder';

// Services
export {
  FormBuilderServiceImpl,
  FormBuilderFactory,
  FormBuilderRegistry,
  FormBuilderContainer,
  formBuilderContainer,
} from './services/form-builder.service';

// Components
export { DynamicForm } from './components/DynamicForm';

// Utilities
export {
  createSchemaFromConfig,
  validateField,
  validateFormData,
  createFormConfigFromSchema,
  mergeFormConfigs,
  createFormBuilderOptions,
  getFieldNames,
  hasRequiredFields,
  getRequiredFieldNames,
  createDefaultValues,
  validateFormConfig,
  formatFormData,
  sanitizeFormData,
} from './utils/form-utils';

// Factories
export {
  createFormBuilder,
  createLoginFormBuilder,
  createRegistrationFormBuilder,
  createProfileFormBuilder,
  createContactFormBuilder,
  createBillFormBuilder,
  createFormConfigFromSchema as createFormConfig,
  createFormService,
  registerFormBuilder,
  createFormContainer,
  createFormBuilderWithMessages,
  createFormBuilderWithMode,
  createDebugFormBuilder,
} from './factories/form-builder.factory';

// Legacy exports for backward compatibility
export { useFormBuilder as useFormBuilderLegacy } from './hooks/useFormBuilder';
export { createFormBuilder as createFormBuilderLegacy } from './factories/form-builder.factory';

// Re-export from legacy location for compatibility
export { useFormBuilder as default } from './hooks/useFormBuilder';
