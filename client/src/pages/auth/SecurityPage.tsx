/**
 * Security Settings Page
 * Comprehensive security management interface
 */

import { Shield, Lock, AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';

export default function SecurityPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Security Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account security and authentication preferences
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Settings Coming Soon:</strong> Advanced security features including 
            two-factor authentication, password management, and security monitoring will be 
            available in the next update.
          </AlertDescription>
        </Alert>

        {/* Placeholder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password Security
              </CardTitle>
              <CardDescription>
                Change your password and view security requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Password management features will be available soon.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Two-factor authentication setup will be available soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}