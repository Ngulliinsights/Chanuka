/**
 * HTTP status codes as type-safe constants
 * Provides literal types for better type safety and IntelliSense
 */

// 1xx Informational
export const HTTP_STATUS_CONTINUE = 100 as const;
export const HTTP_STATUS_SWITCHING_PROTOCOLS = 101 as const;
export const HTTP_STATUS_PROCESSING = 102 as const;
export const HTTP_STATUS_EARLY_HINTS = 103 as const;

// 2xx Success
export const HTTP_STATUS_OK = 200 as const;
export const HTTP_STATUS_CREATED = 201 as const;
export const HTTP_STATUS_ACCEPTED = 202 as const;
export const HTTP_STATUS_NON_AUTHORITATIVE_INFORMATION = 203 as const;
export const HTTP_STATUS_NO_CONTENT = 204 as const;
export const HTTP_STATUS_RESET_CONTENT = 205 as const;
export const HTTP_STATUS_PARTIAL_CONTENT = 206 as const;
export const HTTP_STATUS_MULTI_STATUS = 207 as const;
export const HTTP_STATUS_ALREADY_REPORTED = 208 as const;
export const HTTP_STATUS_IM_USED = 226 as const;

// 3xx Redirection
export const HTTP_STATUS_MULTIPLE_CHOICES = 300 as const;
export const HTTP_STATUS_MOVED_PERMANENTLY = 301 as const;
export const HTTP_STATUS_FOUND = 302 as const;
export const HTTP_STATUS_SEE_OTHER = 303 as const;
export const HTTP_STATUS_NOT_MODIFIED = 304 as const;
export const HTTP_STATUS_USE_PROXY = 305 as const;
export const HTTP_STATUS_TEMPORARY_REDIRECT = 307 as const;
export const HTTP_STATUS_PERMANENT_REDIRECT = 308 as const;

// 4xx Client Error
export const HTTP_STATUS_BAD_REQUEST = 400 as const;
export const HTTP_STATUS_UNAUTHORIZED = 401 as const;
export const HTTP_STATUS_PAYMENT_REQUIRED = 402 as const;
export const HTTP_STATUS_FORBIDDEN = 403 as const;
export const HTTP_STATUS_NOT_FOUND = 404 as const;
export const HTTP_STATUS_METHOD_NOT_ALLOWED = 405 as const;
export const HTTP_STATUS_NOT_ACCEPTABLE = 406 as const;
export const HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED = 407 as const;
export const HTTP_STATUS_REQUEST_TIMEOUT = 408 as const;
export const HTTP_STATUS_CONFLICT = 409 as const;
export const HTTP_STATUS_GONE = 410 as const;
export const HTTP_STATUS_LENGTH_REQUIRED = 411 as const;
export const HTTP_STATUS_PRECONDITION_FAILED = 412 as const;
export const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413 as const;
export const HTTP_STATUS_URI_TOO_LONG = 414 as const;
export const HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE = 415 as const;
export const HTTP_STATUS_RANGE_NOT_SATISFIABLE = 416 as const;
export const HTTP_STATUS_EXPECTATION_FAILED = 417 as const;
export const HTTP_STATUS_IM_A_TEAPOT = 418 as const;
export const HTTP_STATUS_MISDIRECTED_REQUEST = 421 as const;
export const HTTP_STATUS_UNPROCESSABLE_ENTITY = 422 as const;
export const HTTP_STATUS_LOCKED = 423 as const;
export const HTTP_STATUS_FAILED_DEPENDENCY = 424 as const;
export const HTTP_STATUS_TOO_EARLY = 425 as const;
export const HTTP_STATUS_UPGRADE_REQUIRED = 426 as const;
export const HTTP_STATUS_PRECONDITION_REQUIRED = 428 as const;
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429 as const;
export const HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE = 431 as const;
export const HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS = 451 as const;

// 5xx Server Error
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500 as const;
export const HTTP_STATUS_NOT_IMPLEMENTED = 501 as const;
export const HTTP_STATUS_BAD_GATEWAY = 502 as const;
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503 as const;
export const HTTP_STATUS_GATEWAY_TIMEOUT = 504 as const;
export const HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED = 505 as const;
export const HTTP_STATUS_VARIANT_ALSO_NEGOTIATES = 506 as const;
export const HTTP_STATUS_INSUFFICIENT_STORAGE = 507 as const;
export const HTTP_STATUS_LOOP_DETECTED = 508 as const;
export const HTTP_STATUS_NOT_EXTENDED = 510 as const;
export const HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED = 511 as const;

/**
 * Type-safe HTTP status code type
 */
export type HttpStatusCode =
  | typeof HTTP_STATUS_CONTINUE
  | typeof HTTP_STATUS_SWITCHING_PROTOCOLS
  | typeof HTTP_STATUS_PROCESSING
  | typeof HTTP_STATUS_EARLY_HINTS
  | typeof HTTP_STATUS_OK
  | typeof HTTP_STATUS_CREATED
  | typeof HTTP_STATUS_ACCEPTED
  | typeof HTTP_STATUS_NON_AUTHORITATIVE_INFORMATION
  | typeof HTTP_STATUS_NO_CONTENT
  | typeof HTTP_STATUS_RESET_CONTENT
  | typeof HTTP_STATUS_PARTIAL_CONTENT
  | typeof HTTP_STATUS_MULTI_STATUS
  | typeof HTTP_STATUS_ALREADY_REPORTED
  | typeof HTTP_STATUS_IM_USED
  | typeof HTTP_STATUS_MULTIPLE_CHOICES
  | typeof HTTP_STATUS_MOVED_PERMANENTLY
  | typeof HTTP_STATUS_FOUND
  | typeof HTTP_STATUS_SEE_OTHER
  | typeof HTTP_STATUS_NOT_MODIFIED
  | typeof HTTP_STATUS_USE_PROXY
  | typeof HTTP_STATUS_TEMPORARY_REDIRECT
  | typeof HTTP_STATUS_PERMANENT_REDIRECT
  | typeof HTTP_STATUS_BAD_REQUEST
  | typeof HTTP_STATUS_UNAUTHORIZED
  | typeof HTTP_STATUS_PAYMENT_REQUIRED
  | typeof HTTP_STATUS_FORBIDDEN
  | typeof HTTP_STATUS_NOT_FOUND
  | typeof HTTP_STATUS_METHOD_NOT_ALLOWED
  | typeof HTTP_STATUS_NOT_ACCEPTABLE
  | typeof HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED
  | typeof HTTP_STATUS_REQUEST_TIMEOUT
  | typeof HTTP_STATUS_CONFLICT
  | typeof HTTP_STATUS_GONE
  | typeof HTTP_STATUS_LENGTH_REQUIRED
  | typeof HTTP_STATUS_PRECONDITION_FAILED
  | typeof HTTP_STATUS_PAYLOAD_TOO_LARGE
  | typeof HTTP_STATUS_URI_TOO_LONG
  | typeof HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE
  | typeof HTTP_STATUS_RANGE_NOT_SATISFIABLE
  | typeof HTTP_STATUS_EXPECTATION_FAILED
  | typeof HTTP_STATUS_IM_A_TEAPOT
  | typeof HTTP_STATUS_MISDIRECTED_REQUEST
  | typeof HTTP_STATUS_UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS_LOCKED
  | typeof HTTP_STATUS_FAILED_DEPENDENCY
  | typeof HTTP_STATUS_TOO_EARLY
  | typeof HTTP_STATUS_UPGRADE_REQUIRED
  | typeof HTTP_STATUS_PRECONDITION_REQUIRED
  | typeof HTTP_STATUS_TOO_MANY_REQUESTS
  | typeof HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE
  | typeof HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS
  | typeof HTTP_STATUS_INTERNAL_SERVER_ERROR
  | typeof HTTP_STATUS_NOT_IMPLEMENTED
  | typeof HTTP_STATUS_BAD_GATEWAY
  | typeof HTTP_STATUS_SERVICE_UNAVAILABLE
  | typeof HTTP_STATUS_GATEWAY_TIMEOUT
  | typeof HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED
  | typeof HTTP_STATUS_VARIANT_ALSO_NEGOTIATES
  | typeof HTTP_STATUS_INSUFFICIENT_STORAGE
  | typeof HTTP_STATUS_LOOP_DETECTED
  | typeof HTTP_STATUS_NOT_EXTENDED
  | typeof HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED;

/**
 * HTTP status code ranges for categorization
 */
export const HTTP_STATUS_RANGES = {
  INFORMATIONAL: { min: 100, max: 199 },
  SUCCESS: { min: 200, max: 299 },
  REDIRECTION: { min: 300, max: 399 },
  CLIENT_ERROR: { min: 400, max: 499 },
  SERVER_ERROR: { min: 500, max: 599 },
} as const;

/**
 * Check if status code is in a specific range
 */
export function isInformationalStatus(code: number): code is HttpStatusCode {
  return code >= HTTP_STATUS_RANGES.INFORMATIONAL.min && code <= HTTP_STATUS_RANGES.INFORMATIONAL.max;
}

export function isSuccessStatus(code: number): code is HttpStatusCode {
  return code >= HTTP_STATUS_RANGES.SUCCESS.min && code <= HTTP_STATUS_RANGES.SUCCESS.max;
}

export function isRedirectionStatus(code: number): code is HttpStatusCode {
  return code >= HTTP_STATUS_RANGES.REDIRECTION.min && code <= HTTP_STATUS_RANGES.REDIRECTION.max;
}

export function isClientErrorStatus(code: number): code is HttpStatusCode {
  return code >= HTTP_STATUS_RANGES.CLIENT_ERROR.min && code <= HTTP_STATUS_RANGES.CLIENT_ERROR.max;
}

export function isServerErrorStatus(code: number): code is HttpStatusCode {
  return code >= HTTP_STATUS_RANGES.SERVER_ERROR.min && code <= HTTP_STATUS_RANGES.SERVER_ERROR.max;
}

export function isErrorStatus(code: number): code is HttpStatusCode {
  return isClientErrorStatus(code) || isServerErrorStatus(code);
}




































