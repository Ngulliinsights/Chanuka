# Auth Component Configuration

## Overview

This document describes the configuration options for the auth component system, including validation rules, security settings, and UI behavior.

## Configuration Schema

### Validation Settings

```typescript
validation: {
  enabled: boolean;           // Enable/disable validation
  strict: boolean;           // Use strict validation rules
  realTimeValidation: boolean; // Validate on blur/change
}
```

**Default Values:**
- `enabled`: `true`
- `strict`: `true` 
- `realTimeValidation`: `true`

### Password Requirements

```typescript
password: {
  minLength: number;          // Minimum password length
  requireUppercase: boolean;  // Require uppercase letters
  requireLowercase: boolean;  // Require lowercase letters
  requireNumbers: boolean;    // Require numeric characters
  requireSpecialChars: boolean; // Require special characters
}
```

**Default Values:**
- `minLength`: `12`
- `requireUppercase`: `true`
- `requireLowercase`: `true`
- `requireNumbers`: `true`
- `requireSpecialChars`: `true`

**Special Characters:** `@$!%*?&`

### UI Settings

```typescript
ui: {
  showPasswordRequirements: boolean; // Show password help text
  enablePasswordToggle: boolean;     // Show/hide password button
  autoFocusFirstField: boolean;      // Auto-focus first input
}
```

**Default Values:**
- `showPasswordRequirements`: `true`
- `enablePasswordToggle`: `true`
- `autoFocusFirstField`: `true`

### Security Settings

```typescript
security: {
  sanitizeInput: boolean;    // Sanitize user input
  maxAttempts: number;       // Max failed attempts before lockout
  lockoutDuration: number;   // Lockout duration in seconds
}
```

**Default Values:**
- `sanitizeInput`: `true`
- `maxAttempts`: `5`
- `lockoutDuration`: `300` (5 minutes)

## Validation Rules

### Email Validation

- **Required**: Must not be empty
- **Format**: Must be valid email format
- **Length**: Maximum 254 characters
- **Processing**: Automatically trimmed and lowercased

### Password Validation

#### Login Mode
- **Minimum Length**: 8 characters
- **Maximum Length**: 100 characters

#### Registration Mode (Strict)
- **Minimum Length**: 12 characters
- **Maximum Length**: 100 characters
- **Complexity**: Must contain:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (@$!%*?&)

### Name Validation

- **Minimum Length**: 2 characters
- **Maximum Length**: 50 characters
- **Allowed Characters**: Letters, hyphens (-), and apostrophes (')
- **Processing**: Automatically trimmed

## Error Handling

### Error Types

1. **Validation Errors**: Input format/requirement violations
2. **Credentials Errors**: Invalid login credentials
3. **Registration Errors**: Account creation failures
4. **Network Errors**: Connection/server issues
5. **Rate Limit Errors**: Too many attempts
6. **Session Errors**: Expired/invalid sessions

### Recovery Strategies

#### Automatic Recovery
- **Network Errors**: Retry with exponential backoff
- **Session Errors**: Clear invalid session data

#### User-Guided Recovery
- **Validation Errors**: Field-specific guidance
- **Credentials Errors**: Suggest password reset after multiple attempts
- **Registration Errors**: Switch to login for existing accounts

### Rate Limiting

- **Max Attempts**: 5 failed attempts
- **Lockout Duration**: 5 minutes
- **Retry Delays**: Exponential backoff (1s, 2s, 4s, 8s, 16s)

## API Integration

### Endpoints

- **Login**: `POST /api/auth/login`
- **Register**: `POST /api/auth/register`
- **Logout**: `POST /api/auth/logout`
- **Refresh**: `POST /api/auth/refresh`
- **Reset Password**: `POST /api/auth/reset-password`
- **Verify Email**: `POST /api/auth/verify-email`

### Request Format

#### Login Request
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

#### Registration Request
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "user@example.com",
  "password": "securepassword123!"
}
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Accessibility

### ARIA Labels
- All form inputs have proper labels
- Error messages are associated with inputs
- Loading states are announced to screen readers

### Keyboard Navigation
- Tab order follows logical flow
- Enter key submits forms
- Escape key clears errors

### Screen Reader Support
- Form validation errors are announced
- Loading states provide feedback
- Success/error alerts are announced

## Testing

### Test Data IDs

All components include `data-testid` attributes for reliable testing:

- `auth-page`: Main auth page container
- `auth-card`: Auth form card
- `auth-form`: Form element
- `auth-{field}-input`: Input fields
- `auth-{field}-error`: Error messages
- `auth-submit-button`: Submit button
- `auth-toggle-button`: Mode toggle button

### Mock Data

Use the provided test utilities for consistent mock data:

```typescript
import { createMockAuthData } from '@/components/auth/utils/test-utils';

const mockLoginData = createMockAuthData('login');
const mockRegisterData = createMockAuthData('register');
```

## Performance

### Optimization Strategies

1. **Debounced Validation**: Real-time validation is debounced to prevent excessive API calls
2. **Memoized Components**: Form components use React.memo for performance
3. **Lazy Loading**: Non-critical components are loaded on demand
4. **Bundle Splitting**: Auth components are code-split from main bundle

### Monitoring

- Track validation error rates
- Monitor authentication success/failure rates
- Measure form completion times
- Track user drop-off points

## Security Considerations

### Input Sanitization
- All user input is sanitized to remove control characters
- XSS prevention through proper escaping
- SQL injection prevention through parameterized queries

### Password Security
- Passwords are never stored in plain text
- Client-side validation only for UX (server validates)
- Secure password reset flows

### Session Management
- JWT tokens with appropriate expiration
- Refresh token rotation
- Secure cookie settings

## Customization

### Theming

The auth components use CSS custom properties for theming:

```css
:root {
  --auth-primary-color: #3b82f6;
  --auth-error-color: #ef4444;
  --auth-success-color: #10b981;
  --auth-border-radius: 0.5rem;
  --auth-spacing: 1rem;
}
```

### Custom Validation

Add custom validation rules by extending the validation schemas:

```typescript
import { LoginSchema } from '@/components/auth/validation';

const CustomLoginSchema = LoginSchema.extend({
  customField: z.string().min(1, 'Custom field required')
});
```

### Custom Error Messages

Override default error messages in the configuration:

```typescript
const customConfig = {
  ...defaultConfig,
  errorMessages: {
    ...defaultErrorMessages,
    INVALID_EMAIL: 'Please provide a valid company email'
  }
};
```