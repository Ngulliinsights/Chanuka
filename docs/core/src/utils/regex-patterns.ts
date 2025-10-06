/**
 * Common regex patterns for validation
 */
export class RegexPatterns {
  static readonly EMAIL_LOCAL_STRICT = /^[a-zA-Z0-9._-]+$/;
  static readonly EMAIL_DOMAIN_INTERNATIONAL = /^[a-zA-Z0-9.-]+\.[a-zA-Z\u00a1-\uffff]{2,}$/;
  static readonly EMAIL_DOMAIN_BASIC = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  
  static readonly UPPERCASE = /[A-Z]/;
  static readonly LOWERCASE = /[a-z]/;
  static readonly DIGITS = /\d/;
  static readonly SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>\-_=+\[\]~`]/;
  static readonly NO_REPEATING_CHARS = /(.)(?:\1){2,}/;
  
  static readonly COMMON_PASSWORDS = /^(123456|password|123456789|12345678|12345|password123|qwerty|abc123|admin|welcome123)$/i;
  
  static readonly PHONE_PATTERNS: Record<string, { regex: RegExp; format: string; description: string }> = {
    KE: { 
      regex: /^(?:\+254|0)([17]\d{8})$/,
      format: '+254 $1',
      description: 'Kenyan mobile number'
    },
    US: { 
      regex: /^(?:\+?1)?[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
      format: '+1 ($1) $2-$3',
      description: 'US phone number'
    },
    UK: { 
      regex: /^(?:\+44|0)([1-9]\d{8,9})$/,
      format: '+44 $1',
      description: 'UK phone number'
    },
    CA: { 
      regex: /^(?:\+?1)?[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
      format: '+1 ($1) $2-$3',
      description: 'Canadian phone number'
    },
    AU: { 
      regex: /^(?:\+61|0)([2-9]\d{8})$/,
      format: '+61 $1',
      description: 'Australian phone number'
    },
    INT: { 
      regex: /^\+\d{1,3}[-.\s]?\d{6,14}$/,
      format: '$0',
      description: 'International phone number'
    }
  };
}
