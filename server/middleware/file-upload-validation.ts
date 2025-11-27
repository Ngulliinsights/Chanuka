import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { inputValidationService, commonSchemas } from '@shared/infrastructure/security/input-validation-service.js';
import { ApiError } from '@shared/core/utils/api-utils.js';
import { logger  } from '@shared/core/index.js';

/**
 * File Upload Validation Middleware
 * Provides secure file upload handling with comprehensive validation
 */

export interface FileUploadOptions {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFiles?: number;
  fieldName?: string;
}

export class FileUploadValidator {
  private static instance: FileUploadValidator;

  private constructor() {}

  public static getInstance(): FileUploadValidator {
    if (!FileUploadValidator.instance) {
      FileUploadValidator.instance = new FileUploadValidator();
    }
    return FileUploadValidator.instance;
  }

  /**
   * Create multer middleware with security validations
   */
  public createUploadMiddleware(options: FileUploadOptions) {
    const {
      maxFileSize,
      allowedMimeTypes,
      allowedExtensions,
      maxFiles = 1,
      fieldName = 'file'
    } = options;

    // Configure multer storage
    const storage = multer.memoryStorage();

    // File filter for initial validation
    const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      try {
        // Validate MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
          logger.warn('File upload rejected: invalid MIME type', {
            filename: file.originalname,
            mimetype: file.mimetype,
            allowedTypes: allowedMimeTypes
          });
          return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
        }

        // Validate file extension
        const fileExtension = file.originalname?.split('.').pop()?.toLowerCase();
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
          logger.warn('File upload rejected: invalid extension', {
            filename: file.originalname,
            extension: fileExtension,
            allowedExtensions
          });
          return cb(new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`));
        }

        // Check for suspicious file names
        if (this.isSuspiciousFilename(file.originalname)) {
          logger.warn('File upload rejected: suspicious filename', {
            filename: file.originalname
          });
          return cb(new Error('Invalid filename detected'));
        }

        cb(null, true);
      } catch (error) {
        logger.error('Error in file filter', {
          error: error instanceof Error ? error.message : String(error),
          filename: file.originalname
        });
        cb(new Error('File validation failed'));
      }
    };

    // Create multer instance
    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024, // 1MB for field data
        fields: 10
      }
    });

    // Return middleware function
    return (req: Request, res: Response, next: NextFunction) => {
      const uploadHandler = maxFiles === 1 
        ? upload.single(fieldName)
        : upload.array(fieldName, maxFiles);

      uploadHandler(req, res, (err) => {
        if (err) {
          logger.error('File upload error', {
            error: err.message,
            code: err.code,
            field: err.field
          });

          if (err instanceof multer.MulterError) {
            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                return ApiError(res, {
                  code: 'FILE_TOO_LARGE',
                  message: `File size exceeds maximum allowed size of ${maxFileSize} bytes`
                }, 400);
              case 'LIMIT_FILE_COUNT':
                return ApiError(res, {
                  code: 'TOO_MANY_FILES',
                  message: `Maximum ${maxFiles} files allowed`
                }, 400);
              case 'LIMIT_UNEXPECTED_FILE':
                return ApiError(res, {
                  code: 'UNEXPECTED_FILE',
                  message: `Unexpected file field: ${err.field}`
                }, 400);
              default:
                return ApiError(res, {
                  code: 'UPLOAD_ERROR',
                  message: 'File upload failed'
                }, 400);
            }
          }

          return ApiError(res, {
            code: 'UPLOAD_ERROR',
            message: err.message || 'File upload failed'
          }, 400);
        }

        // Additional validation after multer processing
        this.validateUploadedFiles(req, res, next, {
          maxFileSize,
          allowedMimeTypes,
          allowedExtensions
        });
      });
    };
  }

  /**
   * Additional validation after multer processing
   */
  private validateUploadedFiles(
    req: Request, 
    res: Response, 
    next: NextFunction,
    options: Omit<FileUploadOptions, 'maxFiles' | 'fieldName'>
  ) {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const singleFile = req.file;
      const filesToValidate = singleFile ? [singleFile] : files;

      if (filesToValidate.length === 0) {
        return next(); // No files to validate
      }

      // Validate each file
      for (const file of filesToValidate) {
        const validation = inputValidationService.validateFileUpload(file, {
          maxSize: options.maxFileSize,
          allowedTypes: options.allowedMimeTypes,
          allowedExtensions: options.allowedExtensions
        });

        if (!validation.isValid) {
          logger.warn('File validation failed', {
            filename: file.originalname,
            errors: validation.errors
          });

          return ApiError(res, {
            code: 'FILE_VALIDATION_ERROR',
            message: 'File validation failed',
            details: validation.errors
          }, 400);
        }

        // Additional security checks
        if (this.containsMaliciousContent(file)) {
          logger.warn('Malicious file content detected', {
            filename: file.originalname,
            mimetype: file.mimetype
          });

          return ApiError(res, {
            code: 'MALICIOUS_FILE',
            message: 'File contains potentially malicious content'
          }, 400);
        }
      }

      // Log successful upload
      logger.info('File upload validated successfully', {
        fileCount: filesToValidate.length,
        files: filesToValidate.map(f => ({
          name: f.originalname,
          size: f.size,
          type: f.mimetype
        }))
      });

      next();
    } catch (error) {
      logger.error('Error in file validation', {
        error: error instanceof Error ? error.message : String(error)
      });

      return ApiError(res, {
        code: 'VALIDATION_ERROR',
        message: 'File validation failed'
      }, 500);
    }
  }

  /**
   * Check if filename is suspicious
   */
  private isSuspiciousFilename(filename: string): boolean {
    if (!filename) return true;

    // Check for null bytes
    if (filename.includes('\0')) return true;

    // Check for path traversal attempts
    if (filename.includes('../') || filename.includes('..\\')) return true;

    // Check for suspicious extensions
    const suspiciousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', 
      '.js', '.jar', '.php', '.asp', '.jsp', '.sh'
    ];

    const lowerFilename = filename.toLowerCase();
    if (suspiciousExtensions.some(ext => lowerFilename.endsWith(ext))) return true;

    // Check for double extensions (e.g., file.jpg.exe)
    const parts = filename.split('.');
    if (parts.length > 2) {
      const secondToLastExt = `.${parts[parts.length - 2].toLowerCase()}`;
      if (suspiciousExtensions.includes(secondToLastExt)) return true;
    }

    return false;
  }

  /**
   * Check file content for malicious patterns
   */
  private containsMaliciousContent(file: Express.Multer.File): boolean {
    if (!file.buffer) return false;

    try {
      // Convert buffer to string for text-based analysis
      const content = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 1024));

      // Check for script tags and other dangerous patterns
      const maliciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /eval\s*\(/gi,
        /document\.write/gi,
        /window\.location/gi
      ];

      return maliciousPatterns.some(pattern => pattern.test(content));
    } catch (error) {
      // If we can't analyze the content, err on the side of caution
      logger.warn('Could not analyze file content for malicious patterns', {
        filename: file.originalname,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Create validation middleware for specific file types
   */
  public createImageUploadMiddleware(fieldName = 'image', maxFiles = 1) {
    return this.createUploadMiddleware({
      maxFileSize: commonSchemas.fileUpload.image.maxSize,
      allowedMimeTypes: commonSchemas.fileUpload.image.allowedTypes,
      allowedExtensions: commonSchemas.fileUpload.image.allowedExtensions,
      maxFiles,
      fieldName
    });
  }

  public createDocumentUploadMiddleware(fieldName = 'document', maxFiles = 1) {
    return this.createUploadMiddleware({
      maxFileSize: commonSchemas.fileUpload.document.maxSize,
      allowedMimeTypes: commonSchemas.fileUpload.document.allowedTypes,
      allowedExtensions: commonSchemas.fileUpload.document.allowedExtensions,
      maxFiles,
      fieldName
    });
  }
}

// Export singleton instance
export const fileUploadValidator = FileUploadValidator.getInstance();
