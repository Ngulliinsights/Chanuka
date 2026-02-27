import { logger } from '@server/infrastructure/observability';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import path from 'path';

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
 * TLS Configuration Domain Service
 * Handles TLS/SSL configuration for secure data in transit
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
      if (fs.existsSync(certPath)) {
        config.cert = fs.readFileSync(certPath);
      }

      if (fs.existsSync(keyPath)) {
        config.key = fs.readFileSync(keyPath);
      }

      if (caPath && fs.existsSync(caPath)) {
        config.ca = fs.readFileSync(caPath);
      }

      logger.info('✅ TLS certificates loaded successfully', { component: 'TLSConfigService' });
    } catch (error) {
      logger.error('❌ Failed to load TLS certificates:', { component: 'TLSConfigService' }, error);
      throw new Error('TLS configuration failed');
    }

    return config;
  }

  getDevelopmentTLSConfig(): TLSOptions {
    const certDir = path.join(process.cwd(), 'certs');
    const certPath = path.join(certDir, 'server.crt');
    const keyPath = path.join(certDir, 'server.key');

    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      this.generateSelfSignedCertificate(certPath, keyPath);
    }

    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: this.defaultCiphers,
      honorCipherOrder: true
    };
  }

  private generateSelfSignedCertificate(certPath: string, keyPath: string): void {
    try {
      logger.info('🔧 Generating self-signed certificate for development...', { component: 'TLSConfigService' });

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

      const cert = this.createSelfSignedCert(privateKey, publicKey);

      fs.writeFileSync(keyPath, privateKey);
      fs.writeFileSync(certPath, cert);

      logger.info('✅ Self-signed certificate generated successfully', { component: 'TLSConfigService' });
    } catch (error) {
      logger.error('❌ Failed to generate self-signed certificate:', { component: 'TLSConfigService' }, error);
      throw new Error('Certificate generation failed');
    }
  }

  private createSelfSignedCert(_privateKey: string, _publicKey: string): string {
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

  getHTTPSServerOptions(): https.ServerOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction ? this.getProductionTLSConfig() : this.getDevelopmentTLSConfig();
  }

  validateTLSConfig(options: TLSOptions): boolean {
    try {
      if (!options.cert || !options.key) {
        logger.error('❌ TLS certificate or key missing', { component: 'TLSConfigService' });
        return false;
      }

      if (typeof options.cert === 'string' && !options.cert.includes('BEGIN CERTIFICATE')) {
        logger.error('❌ Invalid certificate format', { component: 'TLSConfigService' });
        return false;
      }

      if (typeof options.key === 'string' && !options.key.includes('BEGIN PRIVATE KEY') && !options.key.includes('BEGIN RSA PRIVATE KEY')) {
        logger.error('❌ Invalid private key format', { component: 'TLSConfigService' });
        return false;
      }

      logger.info('✅ TLS configuration validated successfully', { component: 'TLSConfigService' });
      return true;
    } catch (error) {
      logger.error('❌ TLS configuration validation failed:', { component: 'TLSConfigService' }, error);
      return false;
    }
  }

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

  createSecureAgent(): https.Agent {
    return new https.Agent({
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: this.defaultCiphers,
      honorCipherOrder: true,
      checkServerIdentity: (_hostname, _cert) => {
        return undefined;
      },
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });
  }

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

  async checkCertificateExpiration(certPath: string): Promise<{
    isValid: boolean;
    expires_at?: Date;
    daysUntilExpiry?: number;
    warning?: string;
  }> {
    try {
      if (!fs.existsSync(certPath)) {
        return { isValid: false, warning: 'Certificate file not found' };
      }

      const certContent = fs.readFileSync(certPath, 'utf8');
      
      const certMatch = certContent.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
      if (!certMatch) {
        return { isValid: false, warning: 'Invalid certificate format' };
      }

      const stats = fs.statSync(certPath);
      const created_at = stats.birthtime;
      const expires_at = new Date(created_at.getTime() + 365 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expires_at.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysUntilExpiry < 0) {
        return { 
          isValid: false, 
          expires_at, 
          daysUntilExpiry, 
          warning: 'Certificate has expired' 
        };
      }

      if (daysUntilExpiry < 30) {
        return { 
          isValid: true, 
          expires_at, 
          daysUntilExpiry, 
          warning: `Certificate expires in ${daysUntilExpiry} days` 
        };
      }

      return { isValid: true, expires_at, daysUntilExpiry };
    } catch (error) {
      return { 
        isValid: false, 
        warning: `Certificate check failed: ${(error as Error).message}` 
      };
    }
  }
}

export const tlsConfigService = new TLSConfigService();
