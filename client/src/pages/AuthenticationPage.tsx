/**
 * Enhanced Authentication Page
 * Comprehensive authentication with security and privacy features
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { 
  Shield, 
  Settings, 
  Eye, 
  Lock, 
  UserCheck,
  Info
} from 'lucide-react';
import AuthForm from '../components/auth/auth-forms';
import { SecurityDashboard } from '../components/auth/SecurityDashboard';
import { PrivacyControls } from '../components/auth/PrivacyControls';
import { useAuth } from '../hooks/use-auth';

export default function AuthenticationPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('auth');

  // If user is not authenticated, show only the auth form
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Chanuka</h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Secure access to Kenya's premier civic engagement platform. 
              Your privacy and security are our top priorities.
            </p>
          </div>

          {/* Security Features */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">End-to-End Security</h3>
                  <p className="text-sm text-gray-600">
                    Advanced encryption and security monitoring
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Privacy First</h3>
                  <p className="text-sm text-gray-600">
                    GDPR compliant with granular privacy controls
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <UserCheck className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Two-Factor Auth</h3>
                  <p className="text-sm text-gray-600">
                    Optional 2FA for enhanced account security
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Authentication Form */}
          <div className="max-w-md mx-auto">
            <AuthForm />
          </div>

          {/* Privacy Notice */}
          <div className="max-w-2xl mx-auto mt-8">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                We are committed to protecting your privacy and will never sell your data.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the full dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-600" />
                Account Security & Privacy
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your account security settings and privacy preferences
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <UserCheck className="h-3 w-3 mr-1" />
                Verified Account
              </Badge>
              {auth.user?.two_factor_enabled && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Lock className="h-3 w-3 mr-1" />
                  2FA Enabled
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Dashboard
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Privacy Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-6">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <PrivacyControls />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}