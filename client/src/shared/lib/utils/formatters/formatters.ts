/**
 * Formatters Utilities
 *
 * Utility functions for formatting data
 */

/**
 * Formats a date to a human-readable string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Formats a date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return dateObj.toLocaleDateString('en-KE');
}

/**
 * Formats a date to a specific format
 */
export function formatDateToFormat(date: Date | string, format: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Formats a number with Kenyan locale
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-KE').format(num);
}

/**
 * Formats currency in Kenyan Shillings
 */
export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formats a percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats a phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format Kenyan phone numbers
  if (digits.length === 12 && digits.startsWith('254')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }

  // Format other phone numbers
  if (digits.length >= 10) {
    const countryCode = digits.slice(0, digits.length - 10);
    const areaCode = digits.slice(digits.length - 10, digits.length - 7);
    const firstPart = digits.slice(digits.length - 7, digits.length - 4);
    const secondPart = digits.slice(digits.length - 4);

    return `${countryCode ? '+' + countryCode + ' ' : ''}(${areaCode}) ${firstPart}-${secondPart}`;
  }

  return phone;
}

/**
 * Formats an email address
 */
export function formatEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Formats a name
 */
export function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a title
 */
export function formatTitle(title: string): string {
  return title
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Don't capitalize small words unless they're the first or last word
      const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];

      if (index === 0 || index === title.split(' ').length - 1 || !smallWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      return word;
    })
    .join(' ');
}

/**
 * Formats a slug
 */
export function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formats HTML content
 */
export function formatHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}

/**
 * Formats JSON data
 */
export function formatJson(data: any, spaces: number = 2): string {
  try {
    return JSON.stringify(data, null, spaces);
  } catch (error) {
    return String(data);
  }
}

/**
 * Formats a file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formats a duration in milliseconds to human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formats a URL
 */
export function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (error) {
    return `https://${url}`;
  }
}

/**
 * Formats text with line breaks
 */
export function formatTextWithLineBreaks(text: string): string {
  return text.replace(/\n/g, '<br>');
}

/**
 * Formats a number to ordinal (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(number: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = number % 100;

  return number + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
}

/**
 * Formats a number with ordinal suffix
 */
export function formatNumberWithOrdinal(number: number): string {
  return `${number}${formatOrdinal(number).replace(/^\d+/, '')}`;
}
