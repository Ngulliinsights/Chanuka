import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from '../utils/logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}







