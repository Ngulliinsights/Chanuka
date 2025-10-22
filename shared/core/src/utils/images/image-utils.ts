import { BaseError, ErrorDomain, ErrorSeverity } from '../../observability/error-management';
import { logger } from '../../observability/logging';

const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
};

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ message: string }>;
  metadata: { width: number; height: number; size: number; format: string };
}

class ValidationService {
  static async validate(file: File, validateOptions: {
    size: { max: number };
    format: { allowed: readonly string[] };
    dimensions: { maxWidth: number; maxHeight: number };
  }): Promise<ValidationResult> {
    const metadata = {
      width: 0,
      height: 0,
      size: file.size,
      format: file.name.split('.').pop()?.toLowerCase() || ''
    };

    const errors: Array<{ message: string }> = [];
    
    if (file.size > validateOptions.size.max) {
      errors.push({ 
        message: `File size exceeds maximum allowed (${formatFileSize(validateOptions.size.max)})`
      });
    }

    if (!validateOptions.format.allowed.includes(metadata.format)) {
      errors.push({
        message: `Invalid file format. Allowed formats: ${validateOptions.format.allowed.join(', ')}`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      metadata
    };
  }
}

export class ImageUtils {
  private static readonly config = {
    maxSize: 10 * 1024 * 1024,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'] as const,
    thumbnailSizes: { small: 150, medium: 300, large: 600 },
    defaultQuality: 85
  } as const;

  /**
   * ✅ Validates image using internal ValidationService
   */
  static async validateImage(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    metadata: { width: number; height: number; size: number; format: string };
  }> {
    try {
      const validation = await ValidationService.validate(file, {
        size: { max: this.config.maxSize },
        format: { allowed: this.config.allowedFormats },
        dimensions: { maxWidth: 4000, maxHeight: 4000 }
      });

      return {
        isValid: validation.isValid,
        errors: validation.errors.map(e => e.message),
        metadata: validation.metadata
      };
    } catch (err) {
      throw new BaseError(
        'Image validation failed',
        {
          domain: ErrorDomain.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          code: 'IMAGE_VALIDATION_ERROR',
          cause: err as Error,
          details: { fileName: file.name }
        }
      );
    }
  }

  /**
   * ✅ Safe image loading with error handling
   */
  static async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(
          new BaseError(
            'Failed to load image',
            {
              domain: ErrorDomain.SYSTEM,
              severity: ErrorSeverity.HIGH,
              code: 'IMAGE_LOAD_ERROR',
              details: { fileName: file.name }
            }
          )
        );
      };

      img.src = url;
    });
  }

  /**
   * ✅ Format image metadata using internal formatters
   */
  static formatMetadata(metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  }): string {
    const aspectRatio = (metadata.width / metadata.height).toFixed(2);
    return [
      `${metadata.width}×${metadata.height}`,
      `${aspectRatio}:1 ratio`,
      formatFileSize(metadata.size),
      metadata.format.toUpperCase()
    ].join(' • ');
  }
}











































