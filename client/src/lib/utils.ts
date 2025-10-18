import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from '@shared/core/src/logging';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}







