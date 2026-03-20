/**
 * User Profile Section
 * Consolidates profile information, session management, and basic settings
 * Preserves strengths from profile.tsx
 */

import { Shield, User, Settings, Lock } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

import { useAuth } from '@client/infrastructure/auth';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Switch } from '@client/lib/design-system';

// Session Display Component
function SessionDisplay() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <p className="font-medium">Current Session</p>
            <p className="text-sm text-slate-600">
              {new Date().toLocaleDateString()} at{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-500">Active now</div>
      </div>

      <div className="text-sm text-slate-600">
        <p>Session expires automatically after 24 hours of inactivity.</p>
        <p>Your session is automatically extended while you're active.</p>
      </div>
    </div>
  );
}

export function UserProfileSection() {
  const { user } = useAuth();
  const [emailDigest, setEmailDigest] = useState(true);
  const [billUpdates, setBillUpdates] = useState(true);
  const [commentResponses, setCommentResponses] = useState(true);
  const [newFeatures, setNewFeatures] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showExpertise, setShowExpertise] = useState(true);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8" data-testid="profile-content">
      <div className="grid gap-6 md:grid-cols-2" data-testid="profile-sections">
        {/* Personal Information */}
        <Card data-testid="profile-personal-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="profile-personal-title">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your basic account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="profile-personal-info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-testid="profile-name">
                <label className="text-sm font-medium text-slate-500">Name</label>
                <p className="text-slate-900">{user.profile?.displayName || user.name || (user.username as string | undefined) || 'User'}</p>
              </div>
              <div data-testid="profile-email">
                <label className="text-sm font-medium text-slate-500">Email</label>
                <p className="text-slate-900">{user.email}</p>
              </div>
              <div data-testid="profile-role">
                <label className="text-sm font-medium text-slate-500">Role</label>
                <p className="text-slate-900 capitalize">{user.role || 'User'}</p>
              </div>
              <div data-testid="profile-verification">
                <label className="text-sm font-medium text-slate-500">Verification Status</label>
                <p className="text-slate-900 capitalize">
                  {user.verification || user.verification_status || 'Unverified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity & Stats */}
        <Card data-testid="profile-activity-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="profile-activity-title">
              <Settings className="h-5 w-5" />
              Activity & Stats
            </CardTitle>
            <CardDescription>Your platform engagement and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="profile-activity-info">
            <div className="grid grid-cols-1 gap-4">
              <div data-testid="profile-joined">
                <label className="text-sm font-medium text-slate-500">Member Since</label>
                <p className="text-slate-900">
                  {user.createdAt || (user.created_at as string | undefined)
                    ? new Date(user.createdAt || (user.created_at as string)).toLocaleDateString()
                    : 'January 15, 2023'}
                </p>
              </div>
              <div data-testid="profile-last-active">
                <label className="text-sm font-medium text-slate-500">Last Active</label>
                <p className="text-slate-900">
                  Today at{' '}
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div data-testid="profile-reputation">
                <label className="text-sm font-medium text-slate-500">Reputation</label>
                <p className="text-slate-900">{user.reputation || 142}</p>
              </div>
              <div data-testid="profile-expertise">
                <label className="text-sm font-medium text-slate-500">Expertise</label>
                <p className="text-slate-900">
                  {user.expertise || 'Education Policy, Constitutional Law'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Session Management */}
      <Card data-testid="profile-security-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security & Sessions
          </CardTitle>
          <CardDescription>
            Monitor and manage your active sessions and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <SessionDisplay />

            {/* Quick Security Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Settings
                </h4>
                <p className="text-sm text-slate-600">
                  Manage your password, two-factor authentication, and other security settings.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/auth/security">Go to Security Settings →</a>
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Settings
                </h4>
                <p className="text-sm text-slate-600">
                  Control your privacy preferences and data sharing settings.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/auth/privacy">Go to Privacy Settings →</a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card data-testid="profile-settings-section">
        <CardHeader>
          <CardTitle data-testid="profile-settings-title">Basic Settings</CardTitle>
          <CardDescription>Essential preferences and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6" data-testid="profile-settings-content">
          <div data-testid="profile-preferences">
            <h3 className="text-lg font-medium">Preferences</h3>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between" data-testid="profile-theme">
                <div>
                  <h4 className="font-medium">Theme</h4>
                  <p className="text-sm text-slate-500">Choose your preferred theme</p>
                </div>
                <Button variant="outline" size="sm">
                  System
                </Button>
              </div>
              <div className="flex items-center justify-between" data-testid="profile-email-digest">
                <div>
                  <h4 className="font-medium">Email Digest</h4>
                  <p className="text-sm text-slate-500">Receive a daily summary of activity</p>
                </div>
                <Switch
                  checked={emailDigest}
                  onCheckedChange={setEmailDigest}
                  data-testid="profile-email-digest-switch"
                />
              </div>
            </div>
          </div>

          <div data-testid="profile-notifications">
            <h3 className="text-lg font-medium">Notifications</h3>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between" data-testid="profile-bill-updates">
                <div>
                  <h4 className="font-medium">Bill Updates</h4>
                  <p className="text-sm text-slate-500">Get notified about tracked bill changes</p>
                </div>
                <Switch
                  checked={billUpdates}
                  onCheckedChange={setBillUpdates}
                  data-testid="profile-bill-updates-switch"
                />
              </div>
              <div
                className="flex items-center justify-between"
                data-testid="profile-comment-responses"
              >
                <div>
                  <h4 className="font-medium">Comment Responses</h4>
                  <p className="text-sm text-slate-500">Get notified when someone replies to you</p>
                </div>
                <Switch
                  checked={commentResponses}
                  onCheckedChange={setCommentResponses}
                  data-testid="profile-comment-responses-switch"
                />
              </div>
              <div className="flex items-center justify-between" data-testid="profile-new-features">
                <div>
                  <h4 className="font-medium">New Features</h4>
                  <p className="text-sm text-slate-500">Learn about platform updates</p>
                </div>
                <Switch
                  checked={newFeatures}
                  onCheckedChange={setNewFeatures}
                  data-testid="profile-new-features-switch"
                />
              </div>
            </div>
          </div>

          <div data-testid="profile-privacy">
            <h3 className="text-lg font-medium">Privacy</h3>
            <div className="mt-2 space-y-3">
              <div
                className="flex items-center justify-between"
                data-testid="profile-public-profile"
              >
                <div>
                  <h4 className="font-medium">Public Profile</h4>
                  <p className="text-sm text-slate-500">Make your profile visible to others</p>
                </div>
                <Switch
                  checked={publicProfile}
                  onCheckedChange={setPublicProfile}
                  data-testid="profile-public-profile-switch"
                />
              </div>
              <div
                className="flex items-center justify-between"
                data-testid="profile-show-expertise"
              >
                <div>
                  <h4 className="font-medium">Show Expertise</h4>
                  <p className="text-sm text-slate-500">Display your expertise with comments</p>
                </div>
                <Switch
                  checked={showExpertise}
                  onCheckedChange={setShowExpertise}
                  data-testid="profile-show-expertise-switch"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserProfileSection;
