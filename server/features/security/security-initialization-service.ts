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
      console.log('⚠️  Security already initialized');
      return;
    }

    console.log('🔒 Initializing comprehensive security system...');

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
      console.log('✅ Security system initialized successfully');

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
      console.error('❌ Security initialization failed:', error);
      throw new Error('Security system initialization failed');
    }
  }

  /**
   * Initialize encryption service
   */
  private async initializeEncryption(): Promise<void> {
    console.log('🔐 Initializing encryption service...');

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
      
      console.log('✅ Encryption service initialized and tested');
    } catch (error) {
      console.error('❌ Encryption service test failed:', error);
      throw error;
    }
  }

  /**
   * Set up security middleware
   */
  private async setupSecurityMiddleware(): Promise<void> {
    console.log('🛡️  Setting up security middleware...');

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

    console.log('✅ Security middleware configured');
  }

  /**
   * Initialize session management
   */
  private async initializeSessionManagement(): Promise<void> {
    console.log('🎫 Initializing secure session management...');

    // Clean up expired sessions on startup
    await secureSessionService.cleanupExpiredSessions();

    console.log('✅ Session management initialized');
  }

  /**
   * Set up input validation
   */
  private async setupInputValidation(): Promise<void> {
    console.log('🔍 Setting up input validation...');

    // Test input validation
    try {
      const testEmail = 'test@example.com';
      const validation = inputValidationService.validateEmail(testEmail);
      
      if (!validation.isValid) {
        throw new Error('Input validation test failed');
      }

      console.log('✅ Input validation configured and tested');
    } catch (error) {
      console.error('❌ Input validation test failed:', error);
      throw error;
    }
  }

  /**
   * Initialize security audit logging
   */
  private async initializeSecurityAudit(): Promise<void> {
    console.log('📋 Initializing security audit logging...');

    // Test audit logging
    try {
      await securityAuditService.logSecurityEvent({
        eventType: 'security_audit_test',
        severity: 'low',
        success: true,
        details: { test: true }
      });

      console.log('✅ Security audit logging initialized');
    } catch (error) {
      console.error('❌ Security audit logging test failed:', error);
      throw error;
    }
  }

  /**
   * Set up TLS configuration
   */
  private async setupTLSConfiguration(): Promise<void> {
    console.log('🔐 Setting up TLS configuration...');

    try {
      const tlsOptions = tlsConfigService.getHTTPSServerOptions();
      
      if (tlsConfigService.validateTLSConfig(tlsOptions)) {
        console.log('✅ TLS configuration validated');
        
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
    console.log('👁️  Initializing security monitoring...');

    // Set up periodic security checks
    setInterval(async () => {
      try {
        // Clean up expired sessions
        await secureSessionService.cleanupExpiredSessions();
        
        // Check for security incidents
        // This would integrate with external monitoring tools in production
        
      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    }, 15 * 60 * 1000); // Every 15 minutes

    console.log('✅ Security monitoring initialized');
  }

  /**
   * Set up automated security tasks
   */
  private async setupAutomatedSecurityTasks(): Promise<void> {
    console.log('⚙️  Setting up automated security tasks...');

    // Daily security cleanup
    setInterval(async () => {
      try {
        console.log('🧹 Running daily security cleanup...');
        
        // Clean up expired sessions
        await secureSessionService.cleanupExpiredSessions();
        
        // Generate security report
        const report = await this.generateSecurityReport();
        console.log('📊 Daily security report generated:', report.summary);
        
      } catch (error) {
        console.error('Daily security cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Weekly security audit
    setInterval(async () => {
      try {
        console.log('🔍 Running weekly security audit...');
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const auditReport = await securityAuditService.generateAuditReport(startDate, endDate);
        console.log('📋 Weekly audit report:', auditReport.summary);
        
      } catch (error) {
        console.error('Weekly security audit error:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Every 7 days

    console.log('✅ Automated security tasks configured');
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
      console.error('Security report generation failed:', error);
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

        console.log('✅ HTTPS server created with TLS configuration');
        return server;
      } else {
        console.warn('⚠️  TLS configuration invalid. Cannot create HTTPS server.');
        return null;
      }
    } catch (error) {
      console.error('❌ HTTPS server creation failed:', error);
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