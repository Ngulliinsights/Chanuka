/**
 * Validators Utilities
 *
 * Utility functions for validation
 */

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates Kenyan phone number
 */
export function isValidKenyaPhoneNumber(phone: string): boolean {
  const kenyaPhoneRegex = /^(\+254|0)[17]\d{8}$/;
  return kenyaPhoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Password must be at least 8 characters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Password must contain a lowercase letter');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Password must contain an uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Password must contain a number');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Password must contain a special character');

  return {
    isValid: score >= 4,
    score,
    feedback,
  };
}

/**
 * Validates username format
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validates slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validates UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates date format
 */
export function isValidDate(date: string | Date): boolean {
  if (typeof date === 'string') {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates future date
 */
export function isValidFutureDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isValidDate(dateObj) && dateObj > new Date();
}

/**
 * Validates past date
 */
export function isValidPastDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isValidDate(dateObj) && dateObj < new Date();
}

/**
 * Validates number is positive
 */
export function isValidPositiveNumber(num: number): boolean {
  return typeof num === 'number' && !isNaN(num) && num > 0;
}

/**
 * Validates number is non-negative
 */
export function isValidNonNegativeNumber(num: number): boolean {
  return typeof num === 'number' && !isNaN(num) && num >= 0;
}

/**
 * Validates percentage value
 */
export function isValidPercentage(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100;
}

/**
 * Validates array is not empty
 */
export function isValidNonEmptyArray(arr: any[]): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Validates object is not empty
 */
export function isValidNonEmptyObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && Object.keys(obj).length > 0;
}

/**
 * Validates string is not empty
 */
export function isValidNonEmptyString(str: string): boolean {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Validates string length
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  return typeof str === 'string' && str.length >= min && str.length <= max;
}

/**
 * Validates credit card number
 */
export function isValidCreditCard(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleanNumber = cardNumber.replace(/[\s-]/g, '');

  // Check if all digits
  if (!/^\d+$/.test(cleanNumber)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validates ZIP code
 */
export function isValidZipCode(zip: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

/**
 * Validates IP address (IPv4)
 */
export function isValidIpAddress(ip: string): boolean {
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipRegex);

  if (!match) return false;

  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i]);
    if (octet < 0 || octet > 255) return false;
  }

  return true;
}

/**
 * Validates hex color
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Validates RGB color
 */
export function isValidRgbColor(color: string): boolean {
  const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
  const match = color.match(rgbRegex);

  if (!match) return false;

  for (let i = 1; i <= 3; i++) {
    const value = parseInt(match[i]);
    if (value < 0 || value > 255) return false;
  }

  return true;
}

/**
 * Validates HSL color
 */
export function isValidHslColor(color: string): boolean {
  const hslRegex = /^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$/;
  const match = color.match(hslRegex);

  if (!match) return false;

  const hue = parseInt(match[1]);
  const saturation = parseInt(match[2]);
  const lightness = parseInt(match[3]);

  return hue >= 0 && hue <= 360 && saturation >= 0 && saturation <= 100 && lightness >= 0 && lightness <= 100;
}

/**
 * Validates file size
 */
export function isValidFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

/**
 * Validates file type
 */
export function isValidFileType(fileName: string, allowedTypes: string[]): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Validates image dimensions
 */
export function isValidImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): boolean {
  return width <= maxWidth && height <= maxHeight;
}

/**
 * Validates array of values against a validator function
 */
export function validateArray<T>(
  arr: T[],
  validator: (item: T) => boolean
): { isValid: boolean; invalidItems: T[] } {
  const invalidItems = arr.filter(item => !validator(item));
  return {
    isValid: invalidItems.length === 0,
    invalidItems,
  };
}

/**
 * Validates object properties against a schema
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, (value: any) => boolean>
): { isValid: boolean; invalidFields: string[] } {
  const invalidFields: string[] = [];

  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(obj[key])) {
      invalidFields.push(key);
    }
  }

  return {
    isValid: invalidFields.length === 0,
    invalidFields,
  };
}
