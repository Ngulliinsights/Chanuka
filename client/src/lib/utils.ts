import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from '../utils/logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return targetDate.toLocaleDateString();
  }
}

// Status color utilities
export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'online':
    case 'connected':
    case 'healthy':
      return 'text-green-600';
    case 'warning':
    case 'degraded':
      return 'text-yellow-600';
    case 'error':
    case 'offline':
    case 'disconnected':
    case 'unhealthy':
      return 'text-red-600';
    case 'pending':
    case 'loading':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'online':
    case 'connected':
    case 'healthy':
      return 'bg-green-100';
    case 'warning':
    case 'degraded':
      return 'bg-yellow-100';
    case 'error':
    case 'offline':
    case 'disconnected':
    case 'unhealthy':
      return 'bg-red-100';
    case 'pending':
    case 'loading':
      return 'bg-blue-100';
    default:
      return 'bg-gray-100';
  }
}













































