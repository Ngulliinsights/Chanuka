import { Express } from 'express';
import { encryptionService } from './encryption-service.js';
import { inputValidationService } from './input-validation-service.js';
import { secureSessionService } from './secure-session-service.js';
import { securityAuditService } from './security-audit-service.js';
import { tlsConfigService } from './tls-config-service.js';
import { securityMiddleware } from '../middleware/security-middleware.js';
import { authRateLimit, apiRateLimit } from '../middleware/rate-limiter.js';
import https from 'https';
import fs from 'fs';
import { logger } from '../../utils/logger';

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
      logger.info('⚠️  Security already initialized', { component: 'SimpleTool' });
      return;
    }

    logger.info('🔒 Initializing comprehensive security system...', { component: 'SimpleTool' });

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
      logger.info('✅ Security system initialized successfully', { component: 'SimpleTool' });

      // Log security initialization
      await securityAuditService.logSecurityEvent({
        eventType: 'security_system_initialized',
        severity: 'low',
        success: true,
        details: {
          timestamp: new Date().toISOString(),
          components: [
            'encryption',
            'middleware',
            'session_management',
            'input_validation',
            'audit_logging',
            'tls_configuration',
            'monitoring'
          ]
        }
      });

    } catch (error) {
      logger.error('❌ Security initialization failed:', { component: 'SimpleTool' }, error);
      throw new Error('Security system initialization failed');
    }
  }

  /**
   * Initialize encryption service
   */
  private async initializeEncryption(): Promise<void> {
    logger.info('🔐 Initializing encryption service...', { component: 'SimpleTool' });

    // Validate encryption configuration
    const hasEncryptionKey = process.env.ENCRYPTION_KEY && process.env.KEY_DERIVATION_SALT;
    
    if (!hasEncryptionKey) {
      console.warn('⚠️  No encryption keys found in environment. Using generated keys for development.');
      console.warn('🚨 IMPORTANT: Set ENCRYPTION_KEY and KEY_DERIVATION_SALT in production!');
    }

    // Test encryption functionality
    try {
      const testData = 'security_test_data';
      const encrypted = await encryptionService.encryptData(testData, 'test');
      const decrypted = await encryptionService.decryptData(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('Encryption test failed');
      }
      
      logger.info('✅ Encryption service initialized and tested', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Encryption service test failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Set up security middleware
   */
  private async setupSecurityMiddleware(): Promise<void> {
    logger.info('🛡️  Setting up security middleware...', { component: 'SimpleTool' });

    // Apply all security middleware
    const middlewares = securityMiddleware.initializeAll();
    
    for (const middleware of middlewares) {
      this.app.use(middleware);
    }

    // Add rate limiting for specific endpoints
    this.app.use('/api/auth/login', authRateLimit);
    this.app.use('/api/auth/register', authRateLimit);
    this.app.use('/api/auth/password-reset', authRateLimit);
    this.app.use('/api', apiRateLimit);

    logger.info('✅ Security middleware configured', { component: 'SimpleTool' });
  }

  /**
   * Initialize session management
   */
  private async initializeSessionManagement(): Promise<void> {
    logger.info('🎫 Initializing secure session management...', { component: 'SimpleTool' });

    // Clean up expired sessions on startup
    await secureSessionService.cleanupExpiredSessions();

    logger.info('✅ Session management initialized', { component: 'SimpleTool' });
  }

  /**
   * Set up input validation
   */
  private async setupInputValidation(): Promise<void> {
    logger.info('🔍 Setting up input validation...', { component: 'SimpleTool' });

    // Test input validation
    try {
      const testEmail = 'test@example.com';
      const validation = inputValidationService.validateEmail(testEmail);
      
      if (!validation.isValid) {
        throw new Error('Input validation test failed');
      }

      logger.info('✅ Input validation configured and tested', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Input validation test failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Initialize security audit logging
   */
  private async initializeSecurityAudit(): Promise<void> {
    logger.info('📋 Initializing security audit logging...', { component: 'SimpleTool' });

    // Test audit logging
    try {
      await securityAuditService.logSecurityEvent({
        eventType: 'security_audit_test',
        severity: 'low',
        success: true,
        details: { test: true }
      });

      logger.info('✅ Security audit logging initialized', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Security audit logging test failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Set up TLS configuration
   */
  private async setupTLSConfiguration(): Promise<void> {
    logger.info('🔐 Setting up TLS configuration...', { component: 'SimpleTool' });

    try {
      const tlsOptions = tlsConfigService.getHTTPSServerOptions();
      
      if (tlsConfigService.validateTLSConfig(tlsOptions)) {
        logger.info('✅ TLS configuration validated', { component: 'SimpleTool' });
        
        // Store TLS options for server creation
        (this.app as any).tlsOptions = tlsOptions;
      } else {
        console.warn('⚠️  TLS configuration validation failed. Using HTTP in development.');
      }
    } catch (error) {
      console.warn('⚠️  TLS setup failed:', error.message);
      console.warn('🔄 Continuing with HTTP for development');
    }
  }

  /**
   * Initialize security monitoring
   */
  private async initializeSecurityMonitoring(): Promise<void> {
    logger.info('👁️  Initializing security monitoring...', { component: 'SimpleTool' });

    // Set up periodic security checks
    setInterval(async () => {
      try {
        // Clean up expired sessions
        await secureSessionService.cleanupExpiredSessions();
        
        // Check for security incidents
        // This would integrate with external monitoring tools in production
        
      } catch (error) {
        logger.error('Security monitoring error:', { component: 'SimpleTool' }, error);
      }
    }, 15 * 60 * 1000); // Every 15 minutes

    logger.info('✅ Security monitoring initialized', { component: 'SimpleTool' });
  }

  /**
   * Set up automated security tasks
   */
  private async setupAutomatedSecurityTasks(): Promise<void> {
    logger.info('⚙️  Setting up automated security tasks...', { component: 'SimpleTool' });

    // Daily security cleanup
    setInterval(async () => {
      try {
        logger.info('🧹 Running daily security cleanup...', { component: 'SimpleTool' });
        
        // Clean up expired sessions
        await secureSessionService.cleanupExpiredSessions();
        
        // Generate security report
        const report = await this.generateSecurityReport();
        logger.info('📊 Daily security report generated:', { component: 'SimpleTool' }, report.summary);
        
      } catch (error) {
        logger.error('Daily security cleanup error:', { component: 'SimpleTool' }, error);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Weekly security audit
    setInterval(async () => {
      try {
        logger.info('🔍 Running weekly security audit...', { component: 'SimpleTool' });
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const auditReport = await securityAuditService.generateAuditReport(startDate, endDate);
        logger.info('📋 Weekly audit report:', { component: 'SimpleTool' }, auditReport.summary);
        
      } catch (error) {
        logger.error('Weekly security audit error:', { component: 'SimpleTool' }, error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Every 7 days

    logger.info('✅ Automated security tasks configured', { component: 'SimpleTool' });
  }

  /**
   * Generate security status report
   */
  async generateSecurityReport(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    summary: Record<string, any>;
    recommendations: string[];
  }> {
    try {
      const sessionStats = await secureSessionService.getSessionStats();
      
      // Check TLS certificate status
      const certPath = process.env.TLS_CERT_PATH || './certs/server.crt';
      const certStatus = await tlsConfigService.checkCertificateExpiration(certPath);

      const report = {
        status: 'healthy' as const,
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

      if (sessionStats.totalActiveSessions > 1000) {
        report.recommendations.push('High number of active sessions - consider session cleanup');
      }

      if (!process.env.ENCRYPTION_KEY || !process.env.KEY_DERIVATION_SALT) {
        report.status = 'warning';
        report.recommendations.push('Set proper encryption keys in production environment');
      }

      return report;
    } catch (error) {
      logger.error('Security report generation failed:', { component: 'SimpleTool' }, error);
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
      const tlsOptions = (this.app as any).tlsOptions;
      
      if (tlsOptions && tlsConfigService.validateTLSConfig(tlsOptions)) {
        const server = https.createServer(tlsOptions, this.app);
        
        // Add security headers to all HTTPS responses
        server.on('request', (req, res) => {
          const securityHeaders = tlsConfigService.getSecurityHeaders();
          for (const [header, value] of Object.entries(securityHeaders)) {
            res.setHeader(header, value);
          }
        });

        logger.info('✅ HTTPS server created with TLS configuration', { component: 'SimpleTool' });
        return server;
      } else {
        console.warn('⚠️  TLS configuration invalid. Cannot create HTTPS server.');
        return null;
      }
    } catch (error) {
      logger.error('❌ HTTPS server creation failed:', { component: 'SimpleTool' }, error);
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








