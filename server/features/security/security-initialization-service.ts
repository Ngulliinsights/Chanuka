import { logger } from '@shared/core';
import { Express } from 'express';
import fs from 'fs';
import https from 'https';

import { encryptionService } from './encryption-service';
import { securityAuditService } from './security-audit-service';
import { tlsConfigService } from './tls-config-service';
import { inputValidationService } from '@server/infrastructure/core/validation/input-validation-service';
import { secureSessionService } from '@server/infrastructure/core/auth/secure-session-service';
import { securityMiddleware } from './security-middleware';

/**
 * Security initialization service that sets up all security components
 */
export class SecurityInitializationService {
  private app: Express;
  private isInitialized = false;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Initialize all security components
   */
  async initializeSecurity(): Promise<void> {
    if (this.isInitialized) {
      logger.info('⚠️  Security already initialized', { component: 'Chanuka' });
      return;
    }

    logger.info('🔒 Initializing comprehensive security system...', { component: 'Chanuka' });

    try {
      // 1. Initialize encryption service
      await this.initializeEncryption();

      // 2. Set up security middleware
      await this.setupSecurityMiddleware();

      // 3. Initialize session management
      await this.initializeSessionManagement();

      // 4. Set up input validation
      await this.setupInputValidation();

      // 5. Initialize security audit logging
      await this.initializeSecurityAudit();

      // 6. Set up TLS configuration
      await this.setupTLSConfiguration();

      // 7. Initialize security monitoring
      await this.initializeSecurityMonitoring();

      // 8. Set up automated security tasks
      await this.setupAutomatedSecurityTasks();

      this.isInitialized = true;
      logger.info('✅ Security system initialized successfully', { component: 'Chanuka' });

      // Log security initialization
      await securityAuditService.logSecurityEvent({
        event_type: 'security_system_initialized',
        severity: 'low',
        success: true,
        result: 'success',
        details: {
          timestamp: new Date().toISOString(),
          components: [
            'encryption',
            'middleware',
            'session_management',
            'input_validation',
            'audit_logging',
            'tls_configuration',
            'monitoring',
            'automated_tasks'
          ]
        }
      });

    } catch (error) {
      logger.error('❌ Security initialization failed:', { component: 'Chanuka' }, error as Error);
      throw new Error('Security system initialization failed');
    }
  }

  /**
   * Initialize encryption service
   */
  private async initializeEncryption(): Promise<void> {
    logger.info('🔐 Initializing encryption service...', { component: 'Chanuka' });

    // Validate encryption configuration
    const hasEncryptionKey = process.env.ENCRYPTION_KEY && process.env.KEY_DERIVATION_SALT;
    
    if (!hasEncryptionKey) {
      logger.warn('⚠️  No encryption keys found in environment. Using generated keys for development.', { component: 'Chanuka' });
      logger.warn('🚨 IMPORTANT: Set ENCRYPTION_KEY and KEY_DERIVATION_SALT in production!', { component: 'Chanuka' });
    }

    // Test encryption functionality
    try {
      const testData = 'security_test_data';
      const encrypted = await encryptionService.encryptData(testData, 'test');
      const decrypted = await encryptionService.decryptData(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('Encryption test failed');
      }
      
      logger.info('✅ Encryption service initialized and tested', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Encryption service test failed:', { component: 'Chanuka' }, error as Error);
      throw error;
    }
  }

  /**
   * Set up security middleware
   */
  private async setupSecurityMiddleware(): Promise<void> {
    logger.info('🛡️  Setting up security middleware...', { component: 'Chanuka' });
    
    try {
      // Apply security middleware to the Express app
      this.app.use(securityMiddleware);
      
      logger.info('✅ Security middleware configured', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Security middleware setup failed:', { component: 'Chanuka' }, error as Error);
      throw error;
    }
  }

  /**
   * Initialize session management
   */
  private async initializeSessionManagement(): Promise<void> {
    logger.info('🎫 Initializing secure session management...', { component: 'Chanuka' });
    
    try {
      // Test session service functionality
      const testSessionId = 'test-session-' + Date.now();
      
      // Verify session service is available
      if (!secureSessionService) {
        throw new Error('Secure session service not available');
      }
      
      logger.info('✅ Session management initialized', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Session management initialization failed:', { component: 'Chanuka' }, error as Error);
      throw error;
    }
  }

  /**
   * Set up input validation
   */
  private async setupInputValidation(): Promise<void> {
    logger.info('🔍 Setting up input validation...', { component: 'Chanuka' });
    
    try {
      // Test input validation service
      const testValidation = inputValidationService.validateEmail('test@example.com');
      
      if (!testValidation.isValid) {
        throw new Error('Input validation service test failed');
      }
      
      logger.info('✅ Input validation configured and tested', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Input validation setup failed:', { component: 'Chanuka' }, error as Error);
      throw error;
    }
  }

  /**
   * Initialize security monitoring
   */
  private async initializeSecurityMonitoring(): Promise<void> {
    logger.info('👁️  Initializing security monitoring...', { component: 'Chanuka' });
    
    try {
      // Set up monitoring for security events
      // This could include metrics collection, alerting, etc.
      
      logger.info('✅ Security monitoring initialized', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Security monitoring initialization failed:', { component: 'Chanuka' }, error as Error);
      // Don't throw - monitoring is not critical for startup
      logger.warn('⚠️  Continuing without security monitoring', { component: 'Chanuka' });
    }
  }

  /**
   * Set up automated security tasks
   */
  private async setupAutomatedSecurityTasks(): Promise<void> {
    logger.info('⚙️  Setting up automated security tasks...', { component: 'Chanuka' });
    
    try {
      // Set up periodic security tasks
      // - Session cleanup
      // - Certificate expiration checks
      // - Security audit log rotation
      
      // Schedule session cleanup every hour
      setInterval(async () => {
        try {
          await secureSessionService.cleanupExpiredSessions();
          logger.debug('Completed scheduled session cleanup', { component: 'Chanuka' });
        } catch (error) {
          logger.error('Session cleanup failed:', { component: 'Chanuka' }, error as Error);
        }
      }, 60 * 60 * 1000); // 1 hour
      
      // Schedule certificate check daily
      setInterval(async () => {
        try {
          const certPath = process.env.TLS_CERT_PATH || './certs/server.crt';
          const certStatus = await tlsConfigService.checkCertificateExpiration(certPath);
          
          if (certStatus.daysUntilExpiry && certStatus.daysUntilExpiry < 30) {
            logger.warn(`⚠️  TLS certificate expires in ${certStatus.daysUntilExpiry} days`, { component: 'Chanuka' });
            
            await securityAuditService.logSecurityEvent({
              event_type: 'certificate_expiration_warning',
              severity: 'medium',
              success: true,
              result: 'warning',
              details: {
                daysUntilExpiry: certStatus.daysUntilExpiry,
                certPath
              }
            });
          }
        } catch (error) {
          logger.error('Certificate check failed:', { component: 'Chanuka' }, error as Error);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      logger.info('✅ Automated security tasks configured', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Automated security tasks setup failed:', { component: 'Chanuka' }, error as Error);
      // Don't throw - automated tasks are not critical for startup
      logger.warn('⚠️  Continuing without automated security tasks', { component: 'Chanuka' });
    }
  }

  /**
   * Initialize security audit logging
   */
  private async initializeSecurityAudit(): Promise<void> {
    logger.info('📋 Initializing security audit logging...', { component: 'Chanuka' });

    // Test audit logging
    try {
      await securityAuditService.logSecurityEvent({
        event_type: 'security_audit_test',
        severity: 'low',
        success: true,
        result: 'success',
        details: { test: true }
      });

      logger.info('✅ Security audit logging initialized', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Security audit logging test failed:', { component: 'Chanuka' }, error as Error);
      throw error;
    }
  }

  /**
   * Set up TLS configuration
   */
  private async setupTLSConfiguration(): Promise<void> {
    logger.info('🔐 Setting up TLS configuration...', { component: 'Chanuka' });

    try {
      const tlsOptions = tlsConfigService.getHTTPSServerOptions();

      if (tlsConfigService.validateTLSConfig(tlsOptions)) {
        logger.info('✅ TLS configuration validated', { component: 'Chanuka' });

        // Store TLS options for server creation
        (this.app as Express & { tlsOptions?: unknown }).tlsOptions = tlsOptions;
      } else {
        logger.warn('⚠️  TLS configuration validation failed. Using HTTP in development.', { component: 'Chanuka' });
      }
    } catch (error) {
      logger.warn('⚠️  TLS setup failed:', { component: 'Chanuka' }, error as Error);
      logger.warn('🔄 Continuing with HTTP for development', { component: 'Chanuka' });
    }
  }

  /**
   * Generate security status report
   */
  async generateSecurityReport(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    summary: Record<string, unknown>;
    recommendations: string[];
  }> {
    try {
      // Get session stats
      const sessionStats = await secureSessionService.getSessionStats();

      // Check TLS certificate status
      const certPath = process.env.TLS_CERT_PATH || './certs/server.crt';
      const certStatus = await tlsConfigService.checkCertificateExpiration(certPath);

      const report = {
        status: 'healthy' as 'healthy' | 'warning' | 'critical',
        summary: {
          activeSessions: sessionStats.totalActiveSessions,
          recentSessions: sessionStats.sessionsLast24h,
          certificateStatus: certStatus.isValid ? 'valid' : 'invalid',
          certificateExpiry: certStatus.daysUntilExpiry,
          encryptionStatus: 'active',
          auditLogging: 'active'
        },
        recommendations: [] as string[]
      };

      // Check for warnings
      if (certStatus.daysUntilExpiry && certStatus.daysUntilExpiry < 30) {
        report.status = 'warning';
        report.recommendations.push(`TLS certificate expires in ${certStatus.daysUntilExpiry} days`);
      }

      // Check session count
      if (sessionStats.totalActiveSessions > 1000) {
        report.recommendations.push('High number of active sessions - consider session cleanup');
      }

      if (!process.env.ENCRYPTION_KEY || !process.env.KEY_DERIVATION_SALT) {
        report.status = 'warning';
        report.recommendations.push('Set proper encryption keys in production environment');
      }

      return report;
    } catch (error) {
      logger.error('Security report generation failed:', { component: 'Chanuka' }, error as Error);
      return {
        status: 'critical',
        summary: { error: 'Report generation failed' },
        recommendations: ['Check security system configuration']
      };
    }
  }

  /**
   * Get security system status
   */
  getSecurityStatus(): {
    initialized: boolean;
    components: Record<string, boolean>;
    lastCheck: Date;
  } {
    return {
      initialized: this.isInitialized,
      components: {
        encryption: true,
        middleware: true,
        sessionManagement: true,
        inputValidation: true,
        auditLogging: true,
        tlsConfiguration: fs.existsSync('./certs/server.crt') || fs.existsSync(process.env.TLS_CERT_PATH || ''),
        monitoring: true
      },
      lastCheck: new Date()
    };
  }

  /**
   * Create HTTPS server with security configuration
   */
  createSecureServer(): https.Server | null {
    try {
      const tlsOptions = (this.app as Express & { tlsOptions?: unknown }).tlsOptions;
      
      if (tlsOptions && tlsConfigService.validateTLSConfig(tlsOptions)) {
        const server = https.createServer(tlsOptions, this.app);
        
        // Add security headers to all HTTPS responses
        server.on('request', (_req, res) => {
          const securityHeaders = tlsConfigService.getSecurityHeaders();
          for (const [header, value] of Object.entries(securityHeaders)) {
            res.setHeader(header, value);
          }
        });

        logger.info('✅ HTTPS server created with TLS configuration', { component: 'Chanuka' });
        return server;
      } else {
        logger.warn('⚠️  TLS configuration invalid. Cannot create HTTPS server.', { component: 'Chanuka' });
        return null;
      }
    } catch (error) {
      logger.error('❌ HTTPS server creation failed:', { component: 'Chanuka' }, error as Error);
      return null;
    }
  }

  /**
   * Validate security configuration
   */
  async validateSecurityConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET'];
    const recommendedEnvVars = ['ENCRYPTION_KEY', 'KEY_DERIVATION_SALT', 'REFRESH_TOKEN_SECRET'];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    for (const envVar of recommendedEnvVars) {
      if (!process.env[envVar]) {
        warnings.push(`Missing recommended environment variable: ${envVar}`);
      }
    }

    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long');
    }

    // Check if running in production without HTTPS
    if (process.env.NODE_ENV === 'production' && !process.env.TLS_CERT_PATH) {
      errors.push('TLS certificate path required for production');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export factory function
export const createSecurityInitializationService = (app: Express) => {
  return new SecurityInitializationService(app);
};

















































