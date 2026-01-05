
import { Loader2 } from "lucide-react";
import { ReactNode } from 'react';
import { Navigate } from "react-router-dom";

import { useAuth } from '@client/core/auth';
import { logger } from '@client/utils/logger';
import React from 'react';

// TEMPORARY: Authentication bypass for preview purposes
// Set to false to enable authentication in production
const BYPASS_AUTH = process.env.NODE_ENV === 'development';

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

