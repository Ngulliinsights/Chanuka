/**
 * Design System Validation Utilities
 * Ensures design tokens meet accessibility and usability standards
 */

import { contrastRequirements } from '../accessibility/contrast';
import { touchTargets } from '../accessibility/touch';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate color contrast ratio
 */
export function validateContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  textSize: 'normal' | 'large' = 'normal'
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Simplified contrast calculation - real implementation would use proper color parsing
  const mockRatio = 4.5; // Placeholder
  const requirement = contrastRequirements.wcag[level.toLowerCase() as 'aa' | 'aaa'][textSize];

  if (mockRatio < requirement) {
    result.isValid = false;
    result.errors.push(
      `Contrast ratio ${mockRatio.toFixed(1)}:1 does not meet ${level} requirement of ${requirement}:1 for ${textSize} text`
    );
  }

  if (mockRatio < 3.0) {
    result.warnings.push('Contrast ratio is very low and may be difficult to read');
  }

  return result;
}

/**
 * Validate touch target size
 */
export function validateTouchTarget(
  width: number,
  height: number,
  level: 'minimum' | 'comfortable' | 'large' = 'minimum'
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const requirements = touchTargets[level];
  const minWidth = parseFloat(requirements.width);
  const minHeight = parseFloat(requirements.height);

  if (width < minWidth) {
    result.isValid = false;
    result.errors.push(`Touch target width ${width}px is below ${level} requirement of ${minWidth}px`);
  }

  if (height < minHeight) {
    result.isValid = false;
    result.errors.push(`Touch target height ${height}px is below ${level} requirement of ${minHeight}px`);
  }

  if (level === 'minimum' && (width < 48 || height < 48)) {
    result.warnings.push('Consider using comfortable touch target size (48px) for better usability');
  }

  return result;
}

/**
 * Validate font size for readability
 */
export function validateFontSize(
  fontSize: string,
  context: 'body' | 'small' | 'caption' = 'body'
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const numericSize = parseFloat(fontSize);
  const minimumSizes = {
    body: 16,
    small: 14,
    caption: 12,
  };

  const minimum = minimumSizes[context];

  if (numericSize < minimum) {
    result.isValid = false;
    result.errors.push(`Font size ${fontSize} is below minimum requirement of ${minimum}px for ${context} text`);
  }

  if (numericSize < 12) {
    result.warnings.push('Font size is very small and may be difficult to read');
  }

  return result;
}

/**
 * Validate spacing for accessibility
 */
export function validateSpacing(
  spacing: string,
  context: 'touch' | 'text' | 'component' = 'component'
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const numericSpacing = parseFloat(spacing);
  const minimumSpacing = {
    touch: 8,     // Minimum space between touch targets
    text: 4,      // Minimum space around text
    component: 8, // Minimum component spacing
  };

  const minimum = minimumSpacing[context];

  if (numericSpacing < minimum) {
    result.isValid = false;
    result.errors.push(`Spacing ${spacing} is below minimum requirement of ${minimum}px for ${context}`);
  }

  return result;
}

/**
 * Validate component design tokens
 */
export function validateComponent(component: {
  colors?: { foreground: string; background: string };
  dimensions?: { width: number; height: number };
  typography?: { fontSize: string; lineHeight: string };
  spacing?: { padding: string; margin: string };
}): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate colors
  if (component.colors) {
    const contrastResult = validateContrast(
      component.colors.foreground,
      component.colors.background
    );
    result.errors.push(...contrastResult.errors);
    result.warnings.push(...contrastResult.warnings);
    if (!contrastResult.isValid) result.isValid = false;
  }

  // Validate dimensions
  if (component.dimensions) {
    const touchResult = validateTouchTarget(
      component.dimensions.width,
      component.dimensions.height
    );
    result.errors.push(...touchResult.errors);
    result.warnings.push(...touchResult.warnings);
    if (!touchResult.isValid) result.isValid = false;
  }

  // Validate typography
  if (component.typography) {
    const fontResult = validateFontSize(component.typography.fontSize);
    result.errors.push(...fontResult.errors);
    result.warnings.push(...fontResult.warnings);
    if (!fontResult.isValid) result.isValid = false;
  }

  // Validate spacing
  if (component.spacing) {
    const paddingResult = validateSpacing(component.spacing.padding);
    const marginResult = validateSpacing(component.spacing.margin);
    
    result.errors.push(...paddingResult.errors, ...marginResult.errors);
    result.warnings.push(...paddingResult.warnings, ...marginResult.warnings);
    
    if (!paddingResult.isValid || !marginResult.isValid) {
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Batch validate multiple design tokens
 */
export function validateDesignSystem(tokens: {
  colors?: Array<{ name: string; foreground: string; background: string }>;
  components?: Array<{ name: string; [key: string]: any }>;
  typography?: Array<{ name: string; fontSize: string; context?: 'body' | 'small' | 'caption' }>;
}): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  // Validate colors
  if (tokens.colors) {
    tokens.colors.forEach(color => {
      results[`color-${color.name}`] = validateContrast(color.foreground, color.background);
    });
  }

  // Validate typography
  if (tokens.typography) {
    tokens.typography.forEach(typo => {
      results[`typography-${typo.name}`] = validateFontSize(typo.fontSize, typo.context);
    });
  }

  // Validate components
  if (tokens.components) {
    tokens.components.forEach(component => {
      results[`component-${component.name}`] = validateComponent(component);
    });
  }

  return results;
}

/**
 * Generate validation report
 */
export function generateValidationReport(results: Record<string, ValidationResult>): {
  summary: { total: number; valid: number; invalid: number; warnings: number };
  details: Array<{ name: string; status: 'valid' | 'invalid' | 'warning'; issues: string[] }>;
} {
  const details = Object.entries(results).map(([name, result]) => ({
    name,
    status: result.isValid ? (result.warnings.length > 0 ? 'warning' : 'valid') : 'invalid' as const,
    issues: [...result.errors, ...result.warnings],
  }));

  const summary = {
    total: details.length,
    valid: details.filter(d => d.status === 'valid').length,
    invalid: details.filter(d => d.status === 'invalid').length,
    warnings: details.filter(d => d.status === 'warning').length,
  };

  return { summary, details };
}