# Secure Environment Setup Guide

This guide explains how to securely configure environment variables for the Chanuka Platform, ensuring that sensitive credentials are never committed to version control.

## Overview

The application requires certain environment variables for external services like error monitoring and analytics. These variables must be properly configured to prevent security vulnerabilities and ensure the application functions correctly in production.

## Required Environment Variables

### Production Environment (.env.production)

The following variables must be set in your production environment:

```bash
# External Services
VITE_SENTRY_DSN=your-actual-sentry-dsn
VITE_GOOGLE_ANALYTICS_ID=your-actual-ga-id
```

### Development Environment (.env.development) - Optional

For local development, you can create a `.env.development` file with test/development values:

```bash
# External Services (use test/development values)
VITE_SENTRY_DSN=your-dev-sentry-dsn
VITE_GOOGLE_ANALYTICS_ID=your-dev-ga-id
```

## Setting Up Secrets

### 1. Sentry DSN

1. Go to [Sentry.io](https://sentry.io) and log into your account
2. Select your project or create a new one for the Chanuka Platform
3. Navigate to Settings → Projects → [Your Project] → Client Keys (DSN)
4. Copy the DSN value
5. Set `VITE_SENTRY_DSN` to this value

### 2. Google Analytics ID

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a new property or select an existing one
3. Go to Admin → Property → Data Streams
4. Select your web data stream
5. Copy the Measurement ID (format: G-XXXXXXXXXX)
6. Set `VITE_GOOGLE_ANALYTICS_ID` to this value

## Security Best Practices

### Never Commit Secrets

- **DO NOT** commit `.env` files containing real secrets to version control
- The `.env.production` file in the repository has empty values for security
- Use environment-specific secret management

### Environment Variable Management

1. **Local Development**: Use `.env.development` (add to `.gitignore`)
2. **Production**: Set variables in your deployment platform (Vercel, Netlify, etc.)
3. **CI/CD**: Use secret variables in your CI/CD pipeline

### Deployment Platform Configuration

#### Vercel
```bash
vercel env add VITE_SENTRY_DSN
vercel env add VITE_GOOGLE_ANALYTICS_ID
```

#### Netlify
```bash
netlify env:set VITE_SENTRY_DSN
netlify env:set VITE_GOOGLE_ANALYTICS_ID
```

#### Docker
```bash
docker run -e VITE_SENTRY_DSN=your-dsn -e VITE_GOOGLE_ANALYTICS_ID=your-ga-id your-app
```

## Build-Time Validation

The application includes automatic validation that:

- **Fails the build** if required secrets are missing or contain placeholder values in production
- **Warns** if placeholder values are detected in development
- **Prevents deployment** with insecure configurations

### Validation Rules

- `VITE_SENTRY_DSN`: Must be set and not equal to "your-sentry-dsn-here"
- `VITE_GOOGLE_ANALYTICS_ID`: Must be set and not equal to "your-ga-id-here"

If validation fails, you'll see an error like:
```
❌ Environment validation failed:
  - VITE_SENTRY_DSN must be set to a valid value in production mode
```

## Testing Environment Setup

To test that your environment is configured correctly:

1. Set the required environment variables
2. Run the build command:
   ```bash
   npm run build
   ```
3. If validation passes, you'll see:
   ```
   ✅ Environment variables validated successfully
   ```

## Troubleshooting

### Build Fails with Validation Error

- Check that all required variables are set
- Ensure values are not placeholder text
- Verify variable names match exactly (case-sensitive)

### Analytics Not Working

- Confirm `VITE_GOOGLE_ANALYTICS_ID` is a valid Google Analytics Measurement ID
- Check browser console for errors
- Verify the GA script is loading

### Sentry Not Reporting Errors

- Ensure `VITE_SENTRY_DSN` is correct and active
- Check Sentry project settings
- Verify network requests to Sentry are not blocked

## Additional Security Measures

- Rotate secrets regularly
- Use different secrets for different environments
- Monitor secret usage in external services
- Implement proper access controls for secret management

## Contact

If you encounter issues with environment setup, please contact the development team with details about your deployment environment and any error messages.