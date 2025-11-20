/**
 * Status Formatting Utilities
 */

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending';

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getStatusColor(status: StatusType): string {
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    pending: '#6B7280'
  };
  return colors[status] || colors.info;
}

export type ApprovalStatus = 'approved' | 'rejected' | 'pending' | 'reviewing';

export function getApprovalStatusColor(status: string): string {
  const colors: Record<ApprovalStatus, string> = {
    approved: '#10B981',
    rejected: '#EF4444',
    pending: '#F59E0B',
    reviewing: '#3B82F6'
  };
  return colors[status.toLowerCase() as ApprovalStatus] || '#6B7280';
}

export function formatWorkflowStatus(status: string): string {
  return formatStatus(status);
}
















































