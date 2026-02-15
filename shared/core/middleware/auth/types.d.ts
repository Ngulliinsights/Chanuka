/**
 * TypeScript declaration merging for Express Request interface
 * Properly extends the Express Request interface with authentication properties
 * 
 * Requirements: 4.4, 16.2
 */

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      anonymityLevel: string;
    };
    token?: string;
  }
}

export {};
