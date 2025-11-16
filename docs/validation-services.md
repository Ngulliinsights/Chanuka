# Validation Services Documentation

## Overview

The Chanuka Legislative Transparency Platform uses a comprehensive validation framework consisting of multiple specialized services that work together to ensure data integrity, security, and compliance across all platform operations.

## Architecture

The validation system follows a layered architecture:

```
┌─────────────────────────────────────────┐
│         InputValidationService          │
│     Unified API input validation        │
└─────────────────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
┌─────────┴─────────┐ ┌────────┴─────────┐
│ GovernmentData    │ │ DataIntegrity    │
│ ValidationService │ │ ValidationService│
│                   │ │                   │
│ - External data   │ │ - Database       │
│ - Source validation│ │ - Constraint     │
│ - Cross-validation │ │ - Business rules │
└───────────────────┘ └───────────────────┘
          │                   │
          └─────────┬─────────┘
                    │
          ┌─────────┴─────────┐
          │   Shared Utilities│
          │ validation-utils.ts│
          │                   │
          │ - Common schemas  │
          │ - Helper functions│
          │ - Type guards     │
          │ - Constants       │
          └───────────────────┘
```

## InputValidationService

### Overview

The `InputValidationService` is the unified entry point for all API input validation. It provides a consistent interface for validating user inputs, API requests, and form data across the entire platform.

### Key Features

- **Unified Interface**: Single service for all input validation needs
- **Schema-Based Validation**: Uses Zod schemas for type-safe validation
- **Preprocessing**: Automatic data normalization and sanitization
- **Caching**: Intelligent caching to improve performance
- **Metrics**: Comprehensive validation metrics and monitoring
- **Error Handling**: Detailed error reporting with field-level granularity

### Core Methods

#### `validateApiInput<T>(schema: ZodSchema<T>, input: unknown): ValidationResult`

Validates API input data against a Zod schema.

**Parameters:**
- `schema`: Zod schema to validate against
- `input`: Input data to validate

**Returns:**
```typescript
interface ValidationResult {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
}
```

**Example:**
```typescript
import { inputValidationService } from '@server/core/validation';
import { userRegistrationSchema } from '@shared/schema';

const result = inputValidationService.validateApiInput(
  userRegistrationSchema,
  {
    email: 'user@example.com',
    password: 'secure123',
    name: 'John Doe'
  }
);

if (result.isValid) {
  // Process validated data
  await createUser(result.data);
} else {
  // Handle validation errors
  return {
    success: false,
    errors: result.errors
  };
}
```

#### `validateEmail(email: string): { isValid: boolean; sanitized?: string; error?: string }`

Specialized email validation with sanitization.

**Features:**
- RFC-compliant email validation
- Unicode support
- Disposable email detection
- Domain validation
- Automatic sanitization

#### `validateFileUpload(file: any, options: FileValidationOptions): ValidationResult`

Validates file uploads with security checks.

**Validation Rules:**
- File type verification
- Size limits
- Malware scanning
- Content validation
- Metadata sanitization

### Configuration

```typescript
interface InputValidationConfig {
  enableCaching?: boolean;
  cacheTtl?: number;
  enableMetrics?: boolean;
  strictMode?: boolean;
  customValidators?: CustomValidator[];
}
```

## GovernmentDataValidationService

### Overview

The `GovernmentDataValidationService` handles validation of external government data sources, ensuring data integrity and compliance before integration into the platform.

### Key Features

- **Multi-Source Support**: Validates data from Parliament, Senate, County Assemblies
- **Cross-Validation**: Compares data across multiple sources for consistency
- **Data Quality Scoring**: Assigns quality scores based on completeness and accuracy
- **Conflict Resolution**: Automated resolution of conflicting data points
- **Audit Trail**: Complete audit log of validation decisions

### Core Methods

#### `validateBill(bill: any): ValidationResult`

Validates bill data from government sources.

**Validation Checks:**
- Required fields presence
- Data type validation
- Status consistency
- Sponsor verification
- Date validation
- Content sanitization

#### `validateBatch(bills: any[], type: string): BatchValidationResult`

Validates multiple records in batch for performance.

**Parameters:**
- `bills`: Array of bill objects to validate
- `type`: Data type ('bills', 'sponsors', 'votes')

**Returns:**
```typescript
interface BatchValidationResult {
  valid: any[];
  invalid: Array<{
    index: number;
    data: any;
    errors: ValidationError[];
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    qualityScore: number;
  };
}
```

#### `crossValidate(records: any[], type: string): CrossValidationResult`

Performs cross-validation between multiple data sources.

**Features:**
- Source comparison
- Conflict detection
- Priority-based resolution
- Confidence scoring

### Data Quality Metrics

The service calculates comprehensive quality metrics:

```typescript
interface DataQualityMetrics {
  completeness: number;    // 0-1 scale
  accuracy: number;        // 0-1 scale
  consistency: number;     // 0-1 scale
  timeliness: number;      // 0-1 scale
  overall: number;         // Weighted average
}
```

## DataIntegrityValidationService

### Overview

The `DataIntegrityValidationService` ensures database integrity and enforces business rules at the data layer. It validates data before database operations and monitors for integrity violations.

### Key Features

- **Database Constraint Validation**: Ensures referential integrity
- **Business Rule Enforcement**: Validates complex business logic
- **Data Consistency Checks**: Cross-table validation
- **Integrity Monitoring**: Continuous integrity validation
- **Automated Repair**: Self-healing capabilities for minor issues

### Core Methods

#### `validateRecord(record: any, table: string): IntegrityValidationResult`

Validates a single database record.

**Validation Types:**
- Primary key constraints
- Foreign key relationships
- Unique constraints
- Check constraints
- Business rules

#### `runValidationRule(rule: ValidationRule): Promise<ValidationResult>`

Executes a custom validation rule.

**Rule Structure:**
```typescript
interface ValidationRule {
  name: string;
  description: string;
  table: string;
  condition: string;
  severity: 'error' | 'warning' | 'info';
  autoFix?: boolean;
}
```

#### `validateIntegrity(options?: IntegrityCheckOptions): IntegrityReport`

Performs comprehensive integrity check across the database.

**Options:**
```typescript
interface IntegrityCheckOptions {
  tables?: string[];
  rules?: string[];
  sampleSize?: number;
  parallel?: boolean;
}
```

**Returns:**
```typescript
interface IntegrityReport {
  timestamp: Date;
  duration: number;
  tables: {
    [tableName: string]: {
      totalRecords: number;
      invalidRecords: number;
      violations: IntegrityViolation[];
    };
  };
  summary: {
    totalViolations: number;
    criticalIssues: number;
    warnings: number;
  };
}
```

## Shared Utilities (`validation-utils.ts`)

### Overview

The `validation-utils.ts` file contains shared utilities, constants, and helper functions used across all validation services.

### Common Schemas

Pre-built Zod schemas for common validation patterns:

```typescript
// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long');

// Phone number validation (E.164)
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

// Kenyan ID number
export const idNumberSchema = z.string()
  .regex(/^\d{8}$/, 'ID number must be 8 digits');

// Date validation
export const dateSchema = z.string()
  .refine(isValidDate, 'Invalid date format')
  .refine(isReasonableDate, 'Date out of reasonable range');
```

### Helper Functions

#### Type Guards

```typescript
export function isValidationError(obj: any): obj is ValidationError {
  return obj && typeof obj === 'object' && 'field' in obj && 'code' in obj;
}

export function isValidEmail(email: string): boolean {
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  return phoneRegex.test(phone);
}
```

#### Data Sanitization

```typescript
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .substring(0, 10000); // Length limit
}

export function sanitizeHtml(input: string): string {
  // More sophisticated HTML sanitization
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  });
}
```

#### Validation Utilities

```typescript
export function createRequiredFieldError(field: string): ValidationError {
  return {
    field,
    code: 'required',
    message: `${field} is required`
  };
}

export function createFormatError(field: string, expected: string): ValidationError {
  return {
    field,
    code: 'format',
    message: `${field} must be in ${expected} format`
  };
}
```

### Constants

```typescript
export const VALIDATION_CONSTANTS = {
  MAX_STRING_LENGTH: 10000,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 15,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  CACHE_TTL: 300, // 5 minutes
  BATCH_SIZE: 100,
  TIMEOUT: 5000 // 5 seconds
} as const;

export const ERROR_CODES = {
  REQUIRED: 'required',
  FORMAT: 'format',
  LENGTH: 'length',
  RANGE: 'range',
  UNIQUE: 'unique',
  REFERENCE: 'reference',
  CUSTOM: 'custom'
} as const;
```

## Integration Examples

### Complete Validation Pipeline

```typescript
import { inputValidationService } from '@server/core/validation';
import { GovernmentDataValidationService } from '@server/core/validation';
import { DataIntegrityValidationService } from '@server/core/validation';

// 1. Validate API input
const inputResult = await inputValidationService.validateApiInput(
  billSubmissionSchema,
  request.body
);

if (!inputResult.isValid) {
  return { success: false, errors: inputResult.errors };
}

// 2. Validate government data integrity
const govResult = GovernmentDataValidationService.validateBill(inputResult.data);
if (!govResult.isValid) {
  return { success: false, errors: govResult.errors };
}

// 3. Check database integrity
const integrityResult = await DataIntegrityValidationService.validateRecord(
  govResult.data,
  'bills'
);

if (!integrityResult.isValid) {
  return { success: false, errors: integrityResult.errors };
}

// 4. Save validated data
await billRepository.save(integrityResult.data);
return { success: true, data: integrityResult.data };
```

### Batch Processing with Monitoring

```typescript
import { GovernmentDataValidationService } from '@server/core/validation';
import { logger } from '@shared/core';

// Process government data import
async function importGovernmentData(bills: any[]) {
  const startTime = Date.now();

  try {
    // Batch validation
    const validation = GovernmentDataValidationService.validateBatch(bills, 'bills');

    logger.info('Batch validation completed', {
      total: validation.summary.total,
      valid: validation.summary.valid,
      invalid: validation.summary.invalid,
      qualityScore: validation.summary.qualityScore,
      duration: Date.now() - startTime
    });

    // Process valid records
    if (validation.valid.length > 0) {
      await billRepository.bulkInsert(validation.valid);
    }

    // Handle invalid records
    if (validation.invalid.length > 0) {
      await handleInvalidRecords(validation.invalid);
    }

    return {
      success: true,
      processed: validation.valid.length,
      rejected: validation.invalid.length
    };

  } catch (error) {
    logger.error('Government data import failed', { error });
    throw error;
  }
}
```

## Performance Considerations

### Caching Strategy

- **Input Validation**: Cache validated results for 5 minutes
- **Schema Validation**: Cache schema compilation
- **Government Data**: Cache external API responses
- **Integrity Checks**: Cache constraint validations

### Optimization Techniques

- **Batch Processing**: Process multiple records together
- **Parallel Validation**: Validate independent fields concurrently
- **Lazy Loading**: Load validation rules on demand
- **Memory Management**: Automatic cache cleanup and size limits

### Monitoring

All services provide comprehensive metrics:

```typescript
// Get validation metrics
const metrics = inputValidationService.getMetrics();
console.log('Validation Performance:', {
  totalValidations: metrics.totalValidations,
  successRate: metrics.successfulValidations / metrics.totalValidations,
  avgResponseTime: metrics.avgValidationTime,
  cacheHitRate: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
});
```

## Error Handling

### Error Types

```typescript
interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  context?: Record<string, any>;
}

interface IntegrityViolation {
  table: string;
  recordId: any;
  constraint: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

### Error Recovery

- **Automatic Retry**: Failed validations can be retried
- **Fallback Values**: Use default values for missing optional fields
- **Data Repair**: Automatic correction of minor formatting issues
- **Quarantine**: Invalid records are quarantined for manual review

## Testing

### Unit Tests

```typescript
describe('InputValidationService', () => {
  it('should validate valid email', () => {
    const result = inputValidationService.validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = inputValidationService.validateEmail('invalid-email');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid email format');
  });
});
```

### Integration Tests

```typescript
describe('Validation Pipeline', () => {
  it('should process complete validation pipeline', async () => {
    const input = { /* test data */ };

    // Test complete pipeline
    const inputResult = await inputValidationService.validateApiInput(schema, input);
    expect(inputResult.isValid).toBe(true);

    const govResult = GovernmentDataValidationService.validateBill(inputResult.data);
    expect(govResult.isValid).toBe(true);

    const integrityResult = await DataIntegrityValidationService.validateRecord(
      govResult.data, 'bills'
    );
    expect(integrityResult.isValid).toBe(true);
  });
});
```

## Future Enhancements

- **Machine Learning Validation**: AI-powered anomaly detection
- **Real-time Validation**: Streaming validation for live data
- **Custom Rule Engine**: User-defined validation rules
- **Multi-language Support**: Localized validation messages
- **Advanced Analytics**: Predictive validation failure analysis