/**
 * Component template system
 * Barrel exports for clean imports across the application
 */

export * from './component-templates';

// Template utilities
export {
  ComponentTemplateGenerator,
  TemplateValidator,
  generateComponentTemplate,
} from './component-templates';

// Types
export type { ComponentTemplateConfig, TemplateFile } from './component-templates';
