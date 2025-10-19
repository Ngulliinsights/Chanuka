export const ALLOWED_FILE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt']);

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export const SUSPICIOUS_DOMAINS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export default {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  SUSPICIOUS_DOMAINS,
};





































