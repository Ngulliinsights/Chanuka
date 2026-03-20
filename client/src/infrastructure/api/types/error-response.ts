export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DataExportResponse {
  success: boolean;
  data: {
    userData: Record<string, unknown>;
    analytics: Record<string, unknown>;
  };
  timestamp: string;
}

export interface DataDeletionResponse {
  success: boolean;
  deletedRecords: number;
  timestamp: string;
}
