export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  userId?: string;
}
