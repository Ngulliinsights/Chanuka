/**
 * File handling utility types
 */

// File upload utilities
export type FileUploadState = {
  file?: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedUrl?: string;
};

export type AcceptedFileType = 'image/*' | 'video/*' | 'audio/*' | 'application/pdf' | string;
