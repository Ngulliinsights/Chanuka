/**
 * Command Injection Prevention Middleware
 * Provides comprehensive protection against command injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/core';

// Dangerous command patterns that could indicate injection attempts
const DANGEROUS_PATTERNS = [
  // Shell command separators
  /[;&|`$(){}[\]]/,
  // Common shell commands
  /\b(rm|del|format|fdisk|mkfs|dd)\b/i,
  // System commands
  /\b(cat|ls|dir|type|copy|move|mv|cp)\b/i,
  // Network commands
  /\b(wget|curl|nc|netcat|telnet|ssh|ftp)\b/i,
  // Process commands
  /\b(ps|kill|killall|taskkill|tasklist)\b/i,
  // Script execution
  /\b(bash|sh|cmd|powershell|python|node|php|perl)\b/i,
  // File operations
  /\b(chmod|chown|sudo|su|whoami|id)\b/i,
  // Environment manipulation
  /\b(export|set|env|PATH|LD_LIBRARY_PATH)\b/i,
  // Redirection operators
  /[<>]/,
  // Command substitution
  /\$\(/,
  // Backticks for command substitution
  /`[^`]*`/,
  // Double pipe for OR operations
  /\|\|/,
  // Double ampersand for AND operations
  /&&/
];

// File path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /\.\.%2f/i,
  /\.\.%5c/i,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i
];

// SQL injection patterns (additional layer)
const SQL_INJECTION_PATTERNS = [
  /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bexec\b|\bexecute\b)/i,
  /('|(\\')|(;)|(--)|(\s(or|and)\s+\w+\s*=\s*\w+))/i,
  /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/i
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[^>]*>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi
];

interface SecurityViolation {
  type: 'command_injection' | 'path_traversal' | 'sql_injection' | 'xss';
  pattern: string;
  value: string;
  field: string;
}

/**
 * Sanitizes a string by removing or escaping dangerous characters
 */
function sanitizeString(input: string): string {
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape shell metacharacters
    .replace(/[;&|`$(){}[\]<>]/g, '\\$&')
    // Remove or escape quotes
    .replace(/['"]/g, '\\"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a value contains dangerous patterns
 */
function containsDangerousPatterns(value: string): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  // Check for command injection patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
      violations.push({
        type: 'command_injection',
        pattern: pattern.toString(),
        value: value.substring(0, 100), // Truncate for logging
        field: 'unknown'
      });
    }
  }

  // Check for path traversal patterns
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      violations.push({
        type: 'path_traversal',
        pattern: pattern.toString(),
        value: value.substring(0, 100),
        field: 'unknown'
      });
    }
  }

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      violations.push({
        type: 'sql_injection',
        pattern: pattern.toString(),
        value: value.substring(0, 100),
        field: 'unknown'
      });
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      violations.push({
        type: 'xss',
        pattern: pattern.toString(),
        value: value.substring(0, 100),
        field: 'unknown'
      });
    }
  }

  return violations;
}

/**
 * Recursively scans an object for dangerous patterns
 */
function scanObject(obj: any, path = ''): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  if (typeof obj === 'string') {
    const objViolations = containsDangerousPatterns(obj);
    objViolations.forEach(v => {
      v.field = path;
      violations.push(v);
    });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...scanObject(item, `${path}[${index}]`));
    });
  } else if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const newPath = path ? `${path}.${key}` : key;
      violations.push(...scanObject(obj[key], newPath));
    });
  }

  return violations;
}

/**
 * Recursively sanitizes an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  } else if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }
  return obj;
}

/**
 * Command injection prevention middleware
 */
export const commandInjectionPrevention = (options: {
  mode?: 'strict' | 'sanitize' | 'log';
  whitelist?: string[];
  maxViolations?: number;
} = {}) => {
  const { mode = 'strict', whitelist = [], maxViolations = 5 } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip whitelisted paths
      if (whitelist.some(path => req.path.startsWith(path))) {
        return next();
      }

      const violations: SecurityViolation[] = [];

      // Scan request body
      if (req.body && typeof req.body === 'object') {
        violations.push(...scanObject(req.body, 'body'));
      }

      // Scan query parameters
      if (req.query && typeof req.query === 'object') {
        violations.push(...scanObject(req.query, 'query'));
      }

      // Scan URL parameters
      if (req.params && typeof req.params === 'object') {
        violations.push(...scanObject(req.params, 'params'));
      }

      // Scan headers (selective)
      const dangerousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
      dangerousHeaders.forEach(header => {
        const value = req.get(header);
        if (value) {
          const headerViolations = containsDangerousPatterns(value);
          headerViolations.forEach(v => {
            v.field = `headers.${header}`;
            violations.push(v);
          });
        }
      });

      // Handle violations based on mode
      if (violations.length > 0) {
        // Log security violation
        logger.warn('Security violation detected', {
          component: 'CommandInjectionPrevention',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          violations: violations.slice(0, maxViolations), // Limit logged violations
          violationCount: violations.length
        });

        switch (mode) {
          case 'strict':
            // Block the request entirely
            return res.status(400).json({
              success: false,
              error: 'Request contains potentially dangerous content',
              code: 'SECURITY_VIOLATION',
              details: {
                violationType: 'command_injection_prevention',
                violationCount: violations.length,
                message: 'Request blocked due to security policy'
              },
              timestamp: new Date().toISOString()
            });

          case 'sanitize':
            // Sanitize the input and continue
            if (req.body) {
              req.body = sanitizeObject(req.body);
            }
            if (req.query) {
              req.query = sanitizeObject(req.query);
            }
            // Note: We don't sanitize params as they're part of the URL structure
            logger.info('Request sanitized and allowed to proceed', {
              component: 'CommandInjectionPrevention',
              path: req.path,
              violationCount: violations.length
            });
            break;

          case 'log':
            // Just log and continue
            logger.info('Security violation logged, request allowed to proceed', {
              component: 'CommandInjectionPrevention',
              path: req.path,
              violationCount: violations.length
            });
            break;
        }
      }

      next();
    } catch (error) {
      logger.error('Error in command injection prevention middleware', {
        component: 'CommandInjectionPrevention',
        error: error instanceof Error ? error.message : String(error),
        path: req.path
      });
      
      // In case of middleware error, allow request to proceed but log the issue
      next();
    }
  };
};

/**
 * File upload security middleware
 */
export const fileUploadSecurity = (options: {
  allowedExtensions?: string[];
  maxFileSize?: number;
  scanContent?: boolean;
} = {}) => {
  const { 
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
    maxFileSize = 10 * 1024 * 1024, // 10MB
    scanContent = true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if this is a file upload request
      if (!req.files && !req.file) {
        return next();
      }

      const files = req.files || (req.file ? [req.file] : []);
      const fileArray = Array.isArray(files) ? files : Object.values(files).flat();

      for (const file of fileArray) {
        // Check file extension
        const ext = file.originalname ? file.originalname.toLowerCase().match(/\.[^.]+$/) : null;
        if (!ext || !allowedExtensions.includes(ext[0])) {
          return res.status(400).json({
            success: false,
            error: 'File type not allowed',
            code: 'INVALID_FILE_TYPE',
            details: {
              allowedExtensions,
              receivedExtension: ext ? ext[0] : 'none'
            },
            timestamp: new Date().toISOString()
          });
        }

        // Check file size
        if (file.size > maxFileSize) {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            code: 'FILE_TOO_LARGE',
            details: {
              maxSize: maxFileSize,
              receivedSize: file.size
            },
            timestamp: new Date().toISOString()
          });
        }

        // Scan file content for dangerous patterns if enabled
        if (scanContent && file.buffer) {
          const content = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 1024));
          const violations = containsDangerousPatterns(content);
          
          if (violations.length > 0) {
            logger.warn('Dangerous content detected in uploaded file', {
              component: 'FileUploadSecurity',
              filename: file.originalname,
              violations: violations.slice(0, 3)
            });

            return res.status(400).json({
              success: false,
              error: 'File contains potentially dangerous content',
              code: 'DANGEROUS_FILE_CONTENT',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Error in file upload security middleware', {
        component: 'FileUploadSecurity',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: 'File security check failed',
        code: 'SECURITY_CHECK_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Rate limiting for security-sensitive endpoints
 */
export const securityRateLimit = (options: {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
} = {}) => {
  const { 
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 5,
    skipSuccessfulRequests = true
  } = options;

  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [ip, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(ip);
      }
    }

    const current = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > current.resetTime) {
      current.count = 0;
      current.resetTime = now + windowMs;
    }

    current.count++;
    requestCounts.set(key, current);

    if (current.count > maxRequests) {
      logger.warn('Security rate limit exceeded', {
        component: 'SecurityRateLimit',
        ip: key,
        path: req.path,
        count: current.count,
        limit: maxRequests
      });

      return res.status(429).json({
        success: false,
        error: 'Too many security-sensitive requests',
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          limit: maxRequests,
          windowMs,
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        timestamp: new Date().toISOString()
      });
    }

    // Track response to potentially skip successful requests
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function(body) {
        if (res.statusCode < 400) {
          // Successful request, decrement counter
          const data = requestCounts.get(key);
          if (data && data.count > 0) {
            data.count--;
            requestCounts.set(key, data);
          }
        }
        return originalSend.call(this, body);
      };
    }

    next();
  };
};

export default {
  commandInjectionPrevention,
  fileUploadSecurity,
  securityRateLimit
};