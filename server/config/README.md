# Server Configuration Management

This document describes the comprehensive configuration management system for the Chanuka Legislative Transparency Platform server.

## Overview

The configuration system provides:
- **Type-safe configuration** with full TypeScript support
- **Environment-specific settings** (development, production, test)
- **Validation and error handling** with helpful error messages
- **Centralized access** throughout the application
- **Secure handling** of sensitive configuration values
- **Hot-reloading** for development environments

## Configuration Structure

### Server Configuration
```typescript
server: {
  port: number;              // Server port (default: 5000)
  nodeEnv: 'development' | 'production' | 'test';
  host: string;              // Server host (default: '0.0.0.0')
  frontendUrl?: string;      // Frontend URL for CORS
  enableHttps: boolean;      // Enable HTTPS (default: false)
  sslKeyPath?: string;       // SSL key path
  sslCertPath?: string;      // SSL certificate path
}
```

### Database Configuration
```typescript
database: {
  url?: string;              // Full database URL (alternative to individual params)
  host: string;              // Database host
  port: number;              // Database port
  name: string;              // Database name
  user: string;              // Database user
  password: string;          // Database password
  ssl: boolean;              // Enable SSL
  maxConnections: number;    // Maximum pool connections
  minConnections: number;    // Minimum pool connections
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  queryTimeoutMillis: number;
}
```

### Authentication Configuration
```typescript
auth: {
  jwtSecret: string;         // JWT signing secret (32+ chars required)
  jwtExpiresIn: string;      // JWT expiration time
  sessionSecret: string;     // Session signing secret (32+ chars required)
  sessionMaxAge: number;     // Session max age in milliseconds
  refreshTokenExpiresIn: string;
  bcryptRounds: number;      // Password hashing rounds (8-16)
  enablePasswordReset: boolean;
  passwordResetTokenExpiresIn: string;
}
```

### Email Configuration
```typescript
email: {
  smtpHost?: string;         // SMTP server host
  smtpPort: number;          // SMTP server port
  smtpUser?: string;         // SMTP username
  smtpPass?: string;         // SMTP password
  smtpSecure: boolean;       // Use secure connection
  fromEmail: string;         // Default from email
  fromName: string;          // Default from name
  enableEmailVerification: boolean;
  enableNotifications: boolean;
}
```

### External API Configuration
```typescript
externalApi: {
  openai: {
    apiKey?: string;         // OpenAI API key
    baseUrl: string;         // OpenAI API base URL
    timeout: number;         // Request timeout
    maxRetries: number;      // Maximum retries
    models: { gpt4: string; gpt35: string; };
  };
  anthropic: {
    apiKey?: string;         // Anthropic API key
    baseUrl: string;         // Anthropic API base URL
    timeout: number;
    maxRetries: number;
    models: { claude3: string; };
  };
  governmentData: {
    congressApiKey?: string; // Congress.gov API key
    congressBaseUrl: string;
    timeout: number;
    maxRetries: number;
    rateLimitPerMinute: number;
  };
}
```

### Feature Flags
```typescript
features: {
  enableAiAnalysis: boolean;
  enableExpertVerification: boolean;
  enableConflictDetection: boolean;
  enableRealTimeUpdates: boolean;
  enableSearchIndexing: boolean;
  enableCaching: boolean;
  enableMonitoring: boolean;
  enableSecurityAuditing: boolean;
  enablePrivacyScheduler: boolean;
  enableNotificationScheduler: boolean;
}
```

### Security Configuration
```typescript
security: {
  enableHelmet: boolean;
  enableCsrfProtection: boolean;
  enableRateLimiting: boolean;
  enableSecurityMonitoring: boolean;
  enableIntrusionDetection: boolean;
  sessionCookieSecure: boolean;
  sessionCookieHttpOnly: boolean;
  sessionCookieSameSite: 'strict' | 'lax' | 'none';
  contentSecurityPolicy: {
    defaultSrc: string[];
    styleSrc: string[];
    fontSrc: string[];
    imgSrc: string[];
    scriptSrc: string[];
    connectSrc: string[];
    objectSrc: string[];
    upgradeInsecureRequests: boolean;
  };
}
```

## Environment Variables

### Required for Production
- `JWT_SECRET`: 32+ character secret for JWT signing
- `SESSION_SECRET`: 32+ character secret for session signing
- `DB_PASSWORD`: Database password

### Optional Configuration
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production/test)
- `DATABASE_URL`: Full database connection URL
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`: Individual DB settings
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email settings
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `ANTHROPIC_API_KEY`: Anthropic API key
- `CONGRESS_API_KEY`: Congress.gov API key
- `REDIS_URL`: Redis connection URL
- `FRONTEND_URL`: Frontend application URL

### Feature Flags
- `ENABLE_AI_ANALYSIS`: Enable AI-powered analysis (default: false)
- `ENABLE_EXPERT_VERIFICATION`: Enable expert verification system
- `ENABLE_CONFLICT_DETECTION`: Enable conflict detection
- `ENABLE_REAL_TIME_UPDATES`: Enable real-time updates
- `ENABLE_SEARCH_INDEXING`: Enable search indexing
- `ENABLE_CACHING`: Enable response caching
- `ENABLE_MONITORING`: Enable performance monitoring
- `ENABLE_SECURITY_AUDITING`: Enable security auditing
- `ENABLE_PRIVACY_SCHEDULER`: Enable privacy data scheduler
- `ENABLE_NOTIFICATION_SCHEDULER`: Enable notification scheduler

## Usage

### Importing Configuration
```typescript
import { config } from './config/index.js';

// Access configuration values
const port = config.server.port;
const dbUrl = config.database.url;
const jwtSecret = config.auth.jwtSecret;
```

### Environment Detection
```typescript
import { isDev, isProd, isTesting } from './config/index.js';

if (isDev()) {
  // Development-specific code
}

if (isProd()) {
  // Production-specific code
}
```

### Hot Reloading (Development Only)
```typescript
import { enableHotReload, disableHotReload } from './config/index.js';

// Enable hot reloading for development
enableHotReload(5000); // Check every 5 seconds

// Disable when needed
disableHotReload();
```

## Environment-Specific Files

The system supports environment-specific configuration files:

- `config/development.ts`: Development overrides
- `config/production.ts`: Production settings
- `config/test.ts`: Test environment settings
- `config/index.ts`: Base configuration with environment detection

## Validation

Configuration is automatically validated on startup using Zod schemas. Invalid configurations will throw descriptive errors:

```
Configuration validation failed:
server.port: Number must be greater than or equal to 1
auth.jwtSecret: String must contain at least 32 character(s)
```

## Security Considerations

- **Secrets**: Never commit secrets to version control
- **Environment Variables**: Use environment-specific values
- **Validation**: All configuration is validated on startup
- **Defaults**: Safe defaults are provided for development
- **Production Checks**: Additional validation for production environment

## Best Practices

1. **Use Environment Variables**: Store sensitive data in environment variables
2. **Validate Early**: Configuration is validated at startup
3. **Type Safety**: Use TypeScript interfaces for autocomplete
4. **Documentation**: Keep this README updated with new configuration options
5. **Testing**: Test configuration loading in different environments

## Migration from Old Config

Replace old config imports:
```typescript
// Old
const config = { port: process.env.PORT || 5000, ... };

// New
import { config } from './config/index.js';
const port = config.server.port;
```

The new system maintains backward compatibility while providing enhanced type safety and validation.