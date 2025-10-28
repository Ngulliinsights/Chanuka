
import { ReactNode } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { logger } from '../utils/browser-logger';

// TEMPORARY: Authentication bypass for preview purposes
const BYPASS_AUTH = true;

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Skip authentication checks when BYPASS_AUTH is true
  if (BYPASS_AUTH) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

