import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from '@shared/core/src/observability/logging';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}







