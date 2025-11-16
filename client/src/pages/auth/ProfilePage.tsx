/**
 * Profile Page
 * User profile management with authentication settings
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { SessionManager } from '../../components/auth/SessionManager';
import { useAuth } from '../../hooks/useAuth';
import { Shield, User, Settings, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Account Profile
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and security preferences
          </p>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <p className="text-gray-900 capitalize">{user.role}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Verification Status</label>
                <p className="text-gray-900 capitalize">{user.verification_status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Session Management
            </CardTitle>
            <CardDescription>
              Monitor and manage your active sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionManager />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage your password, two-factor authentication, and other security settings.
              </p>
              <a 
                href="/auth/security" 
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Go to Security Settings →
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Control your privacy preferences and data sharing settings.
              </p>
              <a 
                href="/auth/privacy" 
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Go to Privacy Settings →
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}