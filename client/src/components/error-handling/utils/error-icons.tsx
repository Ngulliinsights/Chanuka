/**
 * Error Icon Utility
 * Extracted from ErrorFallback.tsx to reduce file size and improve reusability
 */

import { AlertTriangle, Network, Server, Database, Shield } from 'lucide-react';
import { BaseError, ErrorDomain, ErrorSeverity } from '../../../core/error';

export function getErrorIcon(error: BaseError): JSX.Element {
  const domain = (error.metadata?.domain as ErrorDomain | undefined) || ErrorDomain.UNKNOWN;
  const severity = (error.metadata?.severity as ErrorSeverity | undefined) || ErrorSeverity.MEDIUM;
  
  if (severity === ErrorSeverity.CRITICAL) {
    return <AlertTriangle className="h-12 w-12 text-red-600" />;
  }

  switch (domain) {
    case ErrorDomain.NETWORK:
      return <Network className="h-12 w-12 text-orange-500" />;
    
    case ErrorDomain.EXTERNAL_SERVICE:
      return <Server className="h-12 w-12 text-orange-500" />;
    
    case ErrorDomain.DATABASE:
    case ErrorDomain.CACHE:
      return <Database className="h-12 w-12 text-red-500" />;
    
    case ErrorDomain.SECURITY:
    case ErrorDomain.AUTHENTICATION:
    case ErrorDomain.AUTHORIZATION:
      return <Shield className="h-12 w-12 text-red-500" />;
    
    default:
      const colorClass = 
        severity === ErrorSeverity.HIGH ? 'text-red-500' :
        severity === ErrorSeverity.MEDIUM ? 'text-orange-500' :
        'text-yellow-500';
      
      return <AlertTriangle className={`h-12 w-12 ${colorClass}`} />;
  }
}