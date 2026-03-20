# User-Friendly Error Message System

## Overview

The User-Friendly Error Message System provides consistent, helpful error messages across all client systems (Security, Hooks, Library Services, Service Architecture) with comprehensive localization support and intelligent recovery suggestions.

## Features

### 🎯 Core Features

- **Consistent Error Messages**: Standardized error messages across all systems
- **Localization Support**: Multi-language support with easy extensibility
- **Context-Aware Formatting**: Error messages that adapt to context and user needs
- **Recovery Suggestions**: Intelligent, actionable recovery options
- **React Integration**: Seamless integration with React components
- **TypeScript Support**: Full type safety and IntelliSense

### 📋 Error Message Templates

The system includes comprehensive error message templates for all error domains:

- **Network Errors**: Connection failures, timeouts, server errors
- **Authentication Errors**: Session expiration, invalid credentials, permission denied
- **Validation Errors**: Invalid input, missing required fields
- **Database Errors**: Connection failures, query errors
- **System Errors**: Unexpected errors, memory issues
- **External Service Errors**: Service unavailability
- **Business Logic Errors**: Rule violations, constraint failures
- **Cache Errors**: Cache invalidation issues

### 🌍 Localization

- **Default Languages**: English (en-US), Spanish (es-ES), French (fr-FR)
- **Easy Extension**: Add new languages with simple translation objects
- **Fallback Support**: Graceful fallback to English for missing translations
- **Context-Aware**: Translations adapt to error context

### 🔄 Recovery Suggestions

- **Smart Matching**: Suggestions based on error type and context
- **Priority-Based**: Suggestions ranked by likelihood of success
- **Actionable**: Clear, step-by-step recovery instructions
- **Extensible**: Easy to add custom recovery suggestions

## Architecture

```
client/src/infrastructure/error/messages/
├── index.ts                          # Main exports and service
├── error-message-templates.ts        # Error message templates
├── error-message-formatter.ts        # Message formatting utilities
├── error-recovery-suggestions.ts     # Recovery suggestion system
├── use-error-messages.ts            # React hooks
├── __tests__/
│   ├── error-message-system.test.ts  # Core system tests
│   └── use-error-messages.test.tsx   # React hooks tests
└── README.md                        # This documentation
```

## Usage

### Basic Usage

```typescript
import { errorMessageService } from '@client/infrastructure/error/messages';

// Format an error message
const error = new AppError('Connection failed', 'NETWORK_ERROR', 'network');
const formatted = errorMessageService.formatError(error);

console.log(formatted.title);    // "Connection Problem"
console.log(formatted.message);  // "We couldn't connect to the server..."
```

### React Integration

```typescript
import { useErrorMessages } from '@client/infrastructure/error/messages';

function MyComponent() {
  const { formatError, getSuggestions } = useErrorMessages();
  
  const handleApiError = (error: AppError) => {
    const formatted = formatError(error);
    const suggestions = getSuggestions(error);
    
    // Display error to user
    showErrorMessage(formatted.title, formatted.message);
    
    // Show recovery options
    showRecoveryOptions(suggestions);
  };
}
```

### Error Message Provider

```typescript
import { ErrorMessageProvider, useErrorMessageContext } from '@client/infrastructure/error/messages';

function App() {
  return (
    <ErrorMessageProvider>
      <YourApp />
    </ErrorMessageProvider>
  );
}

function ErrorBoundary() {
  const { formatError, getMessage } = useErrorMessageContext();
  
  // Use context to format errors consistently
}
```

### Localization

```typescript
// Get localized message
const message = errorMessageService.getLocalizedMessage(
  'network-connection-failed', 
  'es-ES'
);

// Add custom translations
errorMessageService.addLocalizedMessages('de-DE', {
  'network-connection-failed': 'Verbindung zum Server fehlgeschlagen',
  'auth-session-expired': 'Sitzung abgelaufen',
});
```

### Enhanced Error Messages

```typescript
import { createEnhancedErrorMessage } from '@client/infrastructure/error/messages';

const enhanced = createEnhancedErrorMessage(error, {
  locale: 'fr-FR',
  maxSuggestions: 3,
});

// Contains:
// - formattedMessage: Fully formatted error message
// - template: Original template used
// - recoverySuggestions: Top recovery suggestions
```

## API Reference

### Core Functions

#### `formatErrorMessage(error, options)`
Formats an error with user-friendly message and context.

**Parameters:**
- `error`: AppError or standard Error
- `options`: FormatOptions object

**Returns:** FormattedErrorMessage

#### `getRecoverySuggestions(error, maxSuggestions)`
Gets recovery suggestions for an error.

**Parameters:**
- `error`: AppError
- `maxSuggestions`: Maximum number of suggestions (default: 3)

**Returns:** RecoverySuggestion[]

#### `createEnhancedErrorMessage(error, options)`
Creates a complete error message with formatting and suggestions.

**Parameters:**
- `error`: AppError or standard Error
- `options`: Enhanced message options

**Returns:** EnhancedErrorMessage

### React Hooks

#### `useErrorMessages()`
Main hook for accessing error message functionality.

**Returns:**
- `formatError`: Function to format errors
- `getSuggestions`: Function to get recovery suggestions
- `createEnhancedMessage`: Function to create enhanced messages
- `getMessage`: Function to get localized messages
- `formatForDisplay`: Function to format for text display
- `formatForHTML`: Function to format for HTML display
- `currentLocale`: Current locale

#### `useErrorMessageComponent(error)`
Hook for component-specific error message handling.

**Parameters:**
- `error`: AppError | Error | null

**Returns:**
- `formattedMessage`: Formatted error message
- `recoverySuggestions`: Recovery suggestions
- `displayText`: Text for display
- `htmlContent`: HTML content
- `hasError`: Boolean indicating if error exists

#### `useErrorRecovery(error)`
Hook for error recovery functionality.

**Parameters:**
- `error`: AppError | null

**Returns:**
- `suggestions`: Recovery suggestions
- `primarySuggestion`: Primary suggestion
- `executePrimarySuggestion`: Function to execute primary suggestion
- `hasRecoveryOptions`: Boolean indicating if recovery options exist

### Error Message Service

Singleton service for centralized error message management.

```typescript
const service = ErrorMessageService.getInstance();

// Or use the exported instance
import { errorMessageService } from '@client/infrastructure/error/messages';
```

## Testing

The system includes comprehensive tests covering:

- ✅ Error message templates
- ✅ Localization functionality
- ✅ Message formatting
- ✅ Recovery suggestions
- ✅ React hooks
- ✅ Integration scenarios
- ✅ Error handling edge cases

Run tests with:
```bash
npm test -- client/src/infrastructure/error/messages/__tests__
```

## Integration with Existing Systems

The error message system integrates seamlessly with the existing error handling framework:

1. **Core Error Handler**: Uses the system for message formatting
2. **Error Boundaries**: Display user-friendly messages
3. **Recovery Strategies**: Leverage recovery suggestions
4. **Analytics**: Track error message effectiveness
5. **Monitoring**: Include formatted messages in logs

## Best Practices

### Error Message Design

1. **Be Specific**: Provide clear, actionable information
2. **Use Plain Language**: Avoid technical jargon
3. **Include Context**: Add relevant details (component, operation)
4. **Offer Solutions**: Provide recovery suggestions when possible
5. **Maintain Consistency**: Use consistent terminology across the system

### Localization

1. **Use Keys**: Reference messages by key, not text
2. **Test Translations**: Verify all languages work correctly
3. **Consider Context**: Some messages may need context-specific translations
4. **Update Regularly**: Keep translations in sync with English messages

### Recovery Suggestions

1. **Prioritize**: List most likely solutions first
2. **Be Actionable**: Provide clear steps users can take
3. **Test Suggestions**: Verify suggestions actually work
4. **Update Regularly**: Keep suggestions current with system changes

## Contributing

### Adding New Error Templates

1. Add template to `ERROR_MESSAGE_TEMPLATES` array
2. Include all required fields (id, domain, severity, title, message, priority)
3. Add translations to `DEFAULT_LOCALIZED_MESSAGES`
4. Write tests for the new template

### Adding Recovery Suggestions

1. Add suggestion to `RECOVERY_SUGGESTIONS` array
2. Define applicable domains and severities
3. Include priority and success rate
4. Write tests for the new suggestion

### Adding Localization

1. Use `addLocalizedMessages` or update `DEFAULT_LOCALIZED_MESSAGES`
2. Provide complete translations for all template IDs
3. Test with the new locale
4. Update documentation if needed

## Troubleshooting

### Common Issues

1. **Missing Translations**: Check that all template IDs have translations
2. **Type Errors**: Ensure proper TypeScript types are used
3. **Context Issues**: Verify error context is properly passed
4. **Recovery Suggestions**: Check that suggestions are applicable to the error

### Debug Tips

1. Use `console.log` to inspect formatted messages
2. Check error context for missing information
3. Verify locale settings are correct
4. Test with different error types and severities

## Performance Considerations

- **Template Caching**: Templates are cached for performance
- **Lazy Loading**: Localization data loads on demand
- **Memory Management**: Analytics data is limited to prevent memory leaks
- **React Optimization**: Hooks use memoization to prevent unnecessary re-renders

## Future Enhancements

- **AI-Powered Suggestions**: Use ML to improve recovery suggestions
- **User Feedback**: Collect feedback on error message effectiveness
- **A/B Testing**: Test different message variations
- **Accessibility**: Enhanced screen reader support
- **Analytics Dashboard**: Visualize error patterns and recovery success rates
