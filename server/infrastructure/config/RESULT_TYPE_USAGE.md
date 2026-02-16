# Result Type Usage in ConfigurationManager

## Overview

The `ConfigurationManager` uses the Result type pattern from `neverthrow` for robust error handling. This document details all Result type usage patterns in `manager.ts`.

## Result Type Import

```typescript
import { Result, err, ok } from '../primitives/types/result';
```

The Result type provides type-safe error handling without throwing exceptions, following the Railway-Oriented Programming pattern.

## Methods Using Result Types

### 1. `load(): Promise<Result<AppConfig, ConfigurationError>>`

**Purpose**: Load and validate configuration from multiple sources

**Return Type**: `Promise<Result<AppConfig, ConfigurationError>>`

**Success Case**: Returns `ok(config)` with validated `AppConfig`

**Error Cases**:
- Configuration validation fails → `err(ConfigurationError)`
- Environment file loading fails → `err(ConfigurationError)`
- Dependency validation fails (logged as warning, doesn't fail load)

**Usage Pattern**:
```typescript
const result = await configManager.load();
if (result.isErr()) {
  const error = result.unwrap();
  // Handle error
} else {
  const config = result.unwrap();
  // Use config
}
```

**Internal Result Handling**:
- Calls `buildConfiguration()` which returns `Result<Partial<AppConfig>, ConfigurationError>`
- Calls `validateConfiguration()` which returns `Result<AppConfig, ConfigurationValidationError>`
- Calls `validateRuntimeDependencies()` which returns `Promise<Result<void, ConfigurationError>>`

---

### 2. `configure(overrides: Partial<AppConfig>): Result<void, ConfigurationError>`

**Purpose**: Update configuration with runtime overrides

**Return Type**: `Result<void, ConfigurationError>`

**Success Case**: Returns `ok(undefined)` after successfully merging and validating overrides

**Error Cases**:
- Configuration not loaded → `err(ConfigurationError)`
- Validation fails after merge → `err(ConfigurationValidationError)`
- Merge operation fails → `err(ConfigurationError)`

**Usage Pattern**:
```typescript
const result = configManager.configure({ 
  app: { port: 4000 } 
});
if (result.isErr()) {
  const error = result.unwrap();
  console.error('Configuration update failed:', error.message);
}
```

---

### 3. `validate(): Result<ConfigValidationResult, ConfigurationError>`

**Purpose**: Validate current configuration against schema

**Return Type**: `Result<ConfigValidationResult, ConfigurationError>`

**Success Case**: Always returns `ok(ConfigValidationResult)` with validation details

**Note**: This method always returns `ok()` even when validation fails. The validation status is contained in the `ConfigValidationResult` object:
```typescript
interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string; code: string; received?: any }>;
  warnings: Array<{ path: string; message: string; suggestion?: string }>;
}
```

**Usage Pattern**:
```typescript
const result = configManager.validate();
const validationResult = result.unwrap();
if (!validationResult.valid) {
  console.error('Validation errors:', validationResult.errors);
}
```

---

### 4. `setEncryptionKey(key: string): Result<void, ConfigurationEncryptionError>`

**Purpose**: Set encryption key for sensitive configuration values

**Return Type**: `Result<void, ConfigurationEncryptionError>`

**Success Case**: Returns `ok(undefined)` after setting valid encryption key

**Error Cases**:
- Key length < 32 characters → `err(ConfigurationEncryptionError)`
- Exception during key setting → `err(ConfigurationEncryptionError)`

**Usage Pattern**:
```typescript
const result = configManager.setEncryptionKey(process.env.ENCRYPTION_KEY);
if (result.isErr()) {
  console.error('Failed to set encryption key:', result.unwrap().message);
}
```

---

### 5. `encryptValue(path: string, value: string): Result<string, ConfigurationEncryptionError>`

**Purpose**: Encrypt a configuration value

**Return Type**: `Result<string, ConfigurationEncryptionError>`

**Success Case**: Returns `ok(encryptedValue)` with format `"ENC:${encrypted}"`

**Error Cases**:
- Encryption key not set → `err(ConfigurationEncryptionError)`
- Encryption operation fails → `err(ConfigurationEncryptionError)`

**Usage Pattern**:
```typescript
const result = configManager.encryptValue('database.password', 'secret123');
if (result.isOk()) {
  const encrypted = result.unwrap();
  // Store encrypted value
}
```

---

### 6. `decryptValue(encryptedValue: string): Result<string, ConfigurationEncryptionError>`

**Purpose**: Decrypt a configuration value

**Return Type**: `Result<string, ConfigurationEncryptionError>`

**Success Case**: 
- Returns `ok(decryptedValue)` for encrypted values (starting with "ENC:")
- Returns `ok(encryptedValue)` for non-encrypted values (passthrough)

**Error Cases**:
- Encryption key not set → `err(ConfigurationEncryptionError)`
- Decryption operation fails → `err(ConfigurationEncryptionError)`

**Usage Pattern**:
```typescript
const result = configManager.decryptValue('ENC:abc123...');
if (result.isOk()) {
  const decrypted = result.unwrap();
  // Use decrypted value
}
```

---

### 7. `reload(): Promise<Result<AppConfig, ConfigurationError>>`

**Purpose**: Reload configuration (for hot reloading)

**Return Type**: `Promise<Result<AppConfig, ConfigurationError>>`

**Success Case**: Returns `ok(config)` with reloaded configuration

**Error Cases**: Same as `load()` method

**Usage Pattern**:
```typescript
const result = await configManager.reload();
if (result.isOk()) {
  console.log('Configuration reloaded successfully');
}
```

---

## Private Methods Using Result Types

### 8. `buildConfiguration(): Result<Partial<AppConfig>, ConfigurationError>`

**Purpose**: Build configuration object from environment variables

**Return Type**: `Result<Partial<AppConfig>, ConfigurationError>`

**Success Case**: Returns `ok(config)` with partial configuration object

**Error Cases**:
- Exception during configuration building → `err(ConfigurationError)`

**Internal Behavior**:
- Calls `decryptValue()` for encrypted environment variables
- Uses `unwrapOr()` to provide fallback values on decryption failure

---

### 9. `validateConfiguration(config: Record<string, any>): Result<AppConfig, ConfigurationValidationError>`

**Purpose**: Validate configuration against Zod schema

**Return Type**: `Result<AppConfig, ConfigurationValidationError>`

**Success Case**: Returns `ok(validatedConfig)` with fully typed `AppConfig`

**Error Cases**:
- Schema validation fails → `err(ConfigurationValidationError)` with detailed error list

---

### 10. `validateRuntimeDependencies(): Promise<Result<void, ConfigurationError>>`

**Purpose**: Validate external dependencies (Redis, Database, Sentry)

**Return Type**: `Promise<Result<void, ConfigurationError>>`

**Success Case**: Returns `ok(undefined)` when all dependencies are validated

**Error Cases**:
- Dependency validation fails → `err(ConfigurationError)`

**Note**: Individual dependency failures are logged as warnings but don't fail the overall validation

---

## Result Type Patterns Used

### 1. Early Return Pattern

```typescript
if (!this._config) {
  return err(new ConfigurationError('Configuration not loaded'));
}
```

### 2. Chained Result Handling

```typescript
const validationResult = this.validateConfiguration(rawConfig);
if (validationResult.isErr()) {
  const error = validationResult.unwrap();
  return err(error);
}
const config = validationResult.unwrap();
```

### 3. Result Unwrapping with Fallback

```typescript
const finalValue = value.startsWith('ENC:') ?
  this.decryptValue(value).unwrapOr(value) : value;
```

### 4. Try-Catch to Result Conversion

```typescript
try {
  // Operation
  return ok(result);
} catch (error) {
  return err(new ConfigurationError(
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error : undefined
  ));
}
```

## Error Hierarchy

```
ConfigurationError (base)
├── ConfigurationValidationError (validation failures)
└── ConfigurationEncryptionError (encryption/decryption failures)
```

All error classes extend `BaseError` from the observability system and include:
- `statusCode`: HTTP status code (500 for config errors)
- `code`: Error code string
- `cause`: Original error if wrapped
- `details`: Additional metadata
- `isOperational`: Always true for config errors
- `domain`: ErrorDomain.SYSTEM
- `severity`: ErrorSeverity.HIGH

## Benefits of Result Type Pattern

1. **Type Safety**: Compiler enforces error handling
2. **Explicit Error Handling**: No hidden exceptions
3. **Composability**: Results can be chained and transformed
4. **Railway-Oriented Programming**: Success and failure paths are explicit
5. **No Try-Catch Pollution**: Cleaner code without nested try-catch blocks
6. **Better Testing**: Easier to test both success and failure paths

## Migration from Throwing Exceptions

The `config` getter still throws for backward compatibility:

```typescript
get config(): AppConfig {
  if (!this._config) {
    throw new ConfigurationError('Configuration not loaded. Call load() first.');
  }
  return this._config;
}
```

**Recommendation**: Use `load()` and check the Result instead of relying on the getter throwing.

## Usage Examples

### Complete Configuration Loading

```typescript
// Initialize manager
const manager = new ConfigurationManager();

// Load configuration
const loadResult = await manager.load();
if (loadResult.isErr()) {
  console.error('Failed to load config:', loadResult.unwrap().message);
  process.exit(1);
}

const config = loadResult.unwrap();
console.log('Configuration loaded:', config.app.name);

// Validate configuration
const validateResult = manager.validate();
const validation = validateResult.unwrap();
if (!validation.valid) {
  console.error('Configuration invalid:', validation.errors);
}

// Update configuration
const updateResult = manager.configure({ 
  app: { port: 4000 } 
});
if (updateResult.isErr()) {
  console.error('Failed to update config:', updateResult.unwrap().message);
}
```

### Encryption/Decryption

```typescript
// Set encryption key
const keyResult = manager.setEncryptionKey(process.env.ENCRYPTION_KEY!);
if (keyResult.isErr()) {
  console.error('Invalid encryption key');
  process.exit(1);
}

// Encrypt sensitive value
const encryptResult = manager.encryptValue('db.password', 'secret123');
if (encryptResult.isOk()) {
  const encrypted = encryptResult.unwrap();
  // Store encrypted value in .env: DB_PASSWORD=ENC:abc123...
}

// Decrypt value (happens automatically during load)
const decryptResult = manager.decryptValue('ENC:abc123...');
if (decryptResult.isOk()) {
  const decrypted = decryptResult.unwrap();
  // Use decrypted value
}
```

## Testing Result Types

```typescript
describe('ConfigurationManager Result Types', () => {
  it('should return error when loading without config', async () => {
    const manager = new ConfigurationManager();
    const result = await manager.load();
    
    // Can test both success and failure paths
    if (result.isErr()) {
      expect(result.unwrap()).toBeInstanceOf(ConfigurationError);
    } else {
      expect(result.unwrap()).toHaveProperty('app');
    }
  });

  it('should return error when encryption key is too short', () => {
    const manager = new ConfigurationManager();
    const result = manager.setEncryptionKey('short');
    
    expect(result.isErr()).toBe(true);
    expect(result.unwrap()).toBeInstanceOf(ConfigurationEncryptionError);
  });
});
```

## Best Practices

1. **Always Check Results**: Never call `unwrap()` without checking `isOk()` or `isErr()` first
2. **Use `unwrapOr()` for Defaults**: Provide fallback values when appropriate
3. **Propagate Errors**: Return Result types from functions that call Result-returning methods
4. **Log Errors**: Emit events or log errors before returning them
5. **Type Narrow Errors**: Use specific error types (ConfigurationValidationError vs ConfigurationError)
6. **Document Error Cases**: Clearly document what errors each method can return

## Future Improvements

1. Add `map()` and `flatMap()` for Result transformation
2. Add `match()` for pattern matching on Result
3. Consider using `ResultAsync` for better async composition
4. Add Result type to more methods (currently some still throw)
5. Create helper functions for common Result patterns
