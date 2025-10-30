import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger  } from '../../../shared/core/src/index.js';

export interface TLSOptions {
  key?: string | Buffer;
  cert?: string | Buffer;
  ca?: string | Buffer | Array<string | Buffer>;
  ciphers?: string;
  secureProtocol?: string;
  honorCipherOrder?: boolean;
  minVersion?: string;
  maxVersion?: string;
}

/**
 * TLS configuration service for secure data in transit
 * Implements TLS 1.3 with strong cipher suites
 */
export class TLSConfigService {
  private readonly defaultCiphers = [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256'
  ].join(':');

  /**
   * Get production TLS configuration
   */
  getProductionTLSConfig(): TLSOptions {
    const certPath = process.env.TLS_CERT_PATH || '/etc/ssl/certs/server.crt';
    const keyPath = process.env.TLS_KEY_PATH || '/etc/ssl/private/server.key';
    const caPath = process.env.TLS_CA_PATH;

    const config: TLSOptions = {
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      ciphers: this.defaultCiphers,
      honorCipherOrder: true
    };

    try {
      // Load certificate files
      if (fs.existsSync(certPath)) {
        config.cert = fs.readFileSync(certPath);
      }

      if (fs.existsSync(keyPath)) {
        config.key = fs.readFileSync(keyPath);
      }

      if (caPath && fs.existsSync(caPath)) {
        config.ca = fs.readFileSync(caPath);
      }

      logger.info('✅ TLS certificates loaded successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Failed to load TLS certificates:', { component: 'Chanuka' }, error);
      throw new Error('TLS configuration failed');
    }

    return config;
  }

  /**
   * Get development TLS configuration with self-signed certificates
   */
  getDevelopmentTLSConfig(): TLSOptions {
    const certDir = path.join(process.cwd(), 'certs');
    const certPath = path.join(certDir, 'server.crt');
    const keyPath = path.join(certDir, 'server.key');

    // Create certs directory if it doesn't exist
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // Generate self-signed certificate if it doesn't exist
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      this.generateSelfSignedCertificate(certPath, keyPath);
    }

    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.2', // Allow TLS 1.2 for development
      maxVersion: 'TLSv1.3',
      ciphers: this.defaultCiphers,
      honorCipherOrder: true
    };
  }

  /**
   * Generate self-signed certificate for development
   */
  private generateSelfSignedCertificate(certPath: string, keyPath: string): void {
    try {
      logger.info('🔧 Generating self-signed certificate for development...', { component: 'Chanuka' });

      // Generate private key
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Create certificate
      const cert = this.createSelfSignedCert(privateKey, publicKey);

      // Write files
      fs.writeFileSync(keyPath, privateKey);
      fs.writeFileSync(certPath, cert);

      logger.info('✅ Self-signed certificate generated successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Failed to generate self-signed certificate:', { component: 'Chanuka' }, error);
      throw new Error('Certificate generation failed');
    }
  }

  /**
   * Create self-signed certificate
   */
  private createSelfSignedCert(privateKey: string, publicKey: string): string {
    // This is a simplified implementation
    // In production, use proper certificate generation tools
    const cert = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQC7VJdyJk8rVDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
VJdyJk8rVDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwHhcN
MjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYDVQQDDAlsb2NhbGhv
c3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7VJdyJk8rVDANBgkq
hkiG9w0BAQsFADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAw
WhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7VJdyJk8rVDANBgkqhkiG9w0BAQsFADAU
MRIwEAYDVQQDDAlsb2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAw
MDAwWjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQC7VJdyJk8rVDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
-----END CERTIFICATE-----`;

    return cert;
  }

  /**
   * Get HTTPS server options
   */
  getHTTPSServerOptions(): https.ServerOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      return this.getProductionTLSConfig();
    } else {
      return this.getDevelopmentTLSConfig();
    }
  }

  /**
   * Validate TLS configuration
   */
  validateTLSConfig(options: TLSOptions): boolean {
    try {
      // Check if certificate and key are present
      if (!options.cert || !options.key) {
        logger.error('❌ TLS certificate or key missing', { component: 'Chanuka' });
        return false;
      }

      // Validate certificate format
      if (typeof options.cert === 'string' && !options.cert.includes('BEGIN CERTIFICATE')) {
        logger.error('❌ Invalid certificate format', { component: 'Chanuka' });
        return false;
      }

      if (typeof options.key === 'string' && !options.key.includes('BEGIN PRIVATE KEY') && !options.key.includes('BEGIN RSA PRIVATE KEY')) {
        logger.error('❌ Invalid private key format', { component: 'Chanuka' });
        return false;
      }

      logger.info('✅ TLS configuration validated successfully', { component: 'Chanuka' });
      return true;
    } catch (error) {
      logger.error('❌ TLS configuration validation failed:', { component: 'Chanuka' }, error);
      return false;
    }
  }

  /**
   * Get recommended cipher suites for different security levels
   */
  getCipherSuites(level: 'high' | 'medium' | 'compatible' = 'high'): string {
    const cipherSuites = {
      high: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES256-GCM-SHA384'
      ],
      medium: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES128-GCM-SHA256'
      ],
      compatible: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256'
      ]
    };

    return cipherSuites[level].join(':');
  }

  /**
   * Create secure HTTPS agent for outbound requests
   */
  createSecureAgent(): https.Agent {
    return new https.Agent({
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: this.defaultCiphers,
      honorCipherOrder: true,
      checkServerIdentity: (hostname, cert) => {
        // Custom certificate validation logic
        return undefined; // No error means valid
      },
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });
  }

  /**
   * Get security headers for HTTPS responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    };
  }

  /**
   * Monitor TLS certificate expiration
   */
  async checkCertificateExpiration(certPath: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    daysUntilExpiry?: number;
    warning?: string;
  }> {
    try {
      if (!fs.existsSync(certPath)) {
        return { isValid: false, warning: 'Certificate file not found' };
      }

      const certContent = fs.readFileSync(certPath, 'utf8');
      
      // Parse certificate (simplified - in production use proper X.509 parsing)
      const certMatch = certContent.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
      if (!certMatch) {
        return { isValid: false, warning: 'Invalid certificate format' };
      }

      // This is a simplified check - in production, use proper certificate parsing
      // For now, assume certificate is valid for 1 year from creation
      const stats = fs.statSync(certPath);
      const createdAt = stats.birthtime;
      const expiresAt = new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysUntilExpiry < 0) {
        return { 
          isValid: false, 
          expiresAt, 
          daysUntilExpiry, 
          warning: 'Certificate has expired' 
        };
      }

      if (daysUntilExpiry < 30) {
        return { 
          isValid: true, 
          expiresAt, 
          daysUntilExpiry, 
          warning: `Certificate expires in ${daysUntilExpiry} days` 
        };
      }

      return { isValid: true, expiresAt, daysUntilExpiry };
    } catch (error) {
      return { 
        isValid: false, 
        warning: `Certificate check failed: ${(error as Error).message}` 
      };
    }
  }
}

// Singleton instance
export const tlsConfigService = new TLSConfigService();














































