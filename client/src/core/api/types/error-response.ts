export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DataExportResponse {
  success: boolean;
  data: Record<string, unknown>;
  format: 'json' | 'csv';
  exportedAt: string;
  downloadUrl?: string;
}

export interface DataDeletionResponse {
  success: boolean;
  deletedAt: string;
  message: string;
}
