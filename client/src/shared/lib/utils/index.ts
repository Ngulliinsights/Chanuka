/**
 * Utilities Module
 *
 * FSD-structured utilities with categorized functions
 */

// Common utilities
export {
  cn,
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  truncateText,
  debounce,
  generateId,
  capitalize,
  slugify,
  deepClone,
  deepEqual,
  deepMerge,
  getNestedValue,
  setNestedValue,
  removeUndefined,
  isEmpty,
  delay,
  retry,
  memoize,
  throttle,
} from './common/common-utils';

// Formatters
export {
  formatDate as formatDateFormatter,
  formatRelativeTime as formatRelativeTimeFormatter,
  formatDateToFormat,
  formatNumber as formatNumberFormatter,
  formatCurrency as formatCurrencyFormatter,
  formatPercentage,
  formatBytes as formatBytesFormatter,
  formatPhoneNumber,
  formatEmail,
  formatName,
  formatTitle,
  formatSlug as formatSlugFormatter,
  formatHtml,
  formatJson,
  formatFileSize,
  formatDuration as formatDurationFormatter,
  formatUrl,
  formatTextWithLineBreaks,
  formatOrdinal,
  formatNumberWithOrdinal,
} from './formatters/formatters';

// Validators
export {
  isValidEmail,
  isValidKenyaPhoneNumber,
  isValidUrl,
  validatePasswordStrength,
  isValidUsername,
  isValidSlug as isValidSlugValidator,
  isValidUuid,
  isValidDate,
  isValidFutureDate,
  isValidPastDate,
  isValidPositiveNumber,
  isValidNonNegativeNumber,
  isValidPercentage,
  isValidNonEmptyArray,
  isValidNonEmptyObject,
  isValidNonEmptyString,
  isValidLength,
  isValidCreditCard,
  isValidZipCode,
  isValidIpAddress,
  isValidHexColor,
  isValidRgbColor,
  isValidHslColor,
  isValidFileSize,
  isValidFileType,
  isValidImageDimensions,
  validateArray,
  validateObject,
} from './validators/validators';

// Helpers
export {
  generateId as generateIdHelper,
  capitalize as capitalizeHelper,
  slugify as slugifyHelper,
  truncateText as truncateTextHelper,
  debounce as debounceHelper,
  throttle as throttleHelper,
  memoize as memoizeHelper,
  delay as delayHelper,
  retry as retryHelper,
  deepClone as deepCloneHelper,
  deepEqual as deepEqualHelper,
  deepMerge as deepMergeHelper,
  getNestedValue as getNestedValueHelper,
  setNestedValue as setNestedValueHelper,
  removeUndefined as removeUndefinedHelper,
  isEmpty as isEmptyHelper,
  uniqueBy,
  groupBy,
  sortBy,
  shuffle,
  randomItem,
  range,
  formatBytes as formatBytesHelper,
  formatDuration as formatDurationHelper,
} from './helpers/helpers';

// Legacy exports for backward compatibility
export {
  cn as cnLegacy,
  formatDate as formatDateLegacy,
  formatRelativeTime as formatRelativeTimeLegacy,
  formatNumber as formatNumberLegacy,
  formatCurrency as formatCurrencyLegacy,
  truncateText as truncateTextLegacy,
  debounce as debounceLegacy,
  isValidEmail as isValidEmailLegacy,
  isValidKenyaPhoneNumber as isValidKenyaPhoneNumberLegacy,
  generateId as generateIdLegacy,
  capitalize as capitalizeLegacy,
  slugify as slugifyLegacy,
} from './common/common-utils';

// Note: common utilities are exported above; avoid duplicate re-exports
