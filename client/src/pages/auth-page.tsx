import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';
import AuthForms from '@/components/auth/auth-forms';
import { logger } from '@/utils/browser-logger';

const AuthPage = () => {
  const { user } = useAuth();

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthForms />;
};

export default AuthPage;