import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminDashboard from '@/components/admin/admin-dashboard';
import { useQuery } from '@tanstack/react-query';

const AdminPage = () => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user;
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      <AdminDashboard />
    </div>
  );
};

export default AdminPage;