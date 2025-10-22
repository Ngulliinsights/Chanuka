import { useState } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { logger } from '@/utils/browser-logger';

export default function Profile() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [emailDigest, setEmailDigest] = useState(true);
  const [billUpdates, setBillUpdates] = useState(true);
  const [commentResponses, setCommentResponses] = useState(true);
  const [newFeatures, setNewFeatures] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showExpertise, setShowExpertise] = useState(true);

  return (
    <AppLayout data-testid="profile-layout">
      <div className="container px-4 py-8 mx-auto max-w-7xl" data-testid="profile-container">
        <div className="space-y-6" data-testid="profile-content">
          <div data-testid="profile-header">
            <h1 className="text-4xl font-bold" data-testid="profile-title">Profile</h1>
            <p className="text-lg text-slate-500" data-testid="profile-subtitle">Manage your account and preferences</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2" data-testid="profile-sections">
            <section className="bg-white rounded-lg border border-slate-200 shadow p-6" data-testid="profile-personal-section">
              <h2 className="text-xl font-semibold mb-4" data-testid="profile-personal-title">Personal Information</h2>
              <div className="space-y-2" data-testid="profile-personal-info">
                <div data-testid="profile-username">
                  <label className="text-sm font-medium text-slate-500">Username</label>
                  <p>{user?.username || 'Username'}</p>
                </div>
                <div data-testid="profile-email">
                  <label className="text-sm font-medium text-slate-500">Email</label>
                  <p>{user?.email || 'email@example.com'}</p>
                </div>
                <div data-testid="profile-joined">
                  <label className="text-sm font-medium text-slate-500">Joined</label>
                  <p>{new Date(user?.createdAt || Date.now()).toLocaleDateString() || 'January 15, 2023'}</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 shadow p-6" data-testid="profile-activity-section">
              <h2 className="text-xl font-semibold mb-4" data-testid="profile-activity-title">Activity</h2>
              <div className="space-y-2" data-testid="profile-activity-info">
                <div data-testid="profile-last-active">
                  <label className="text-sm font-medium text-slate-500">Last Active</label>
                  <p>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div data-testid="profile-reputation">
                  <label className="text-sm font-medium text-slate-500">Reputation</label>
                  <p>{user?.reputation || 142}</p>
                </div>
                <div data-testid="profile-expertise">
                  <label className="text-sm font-medium text-slate-500">Expertise</label>
                  <p>{user?.expertise || 'Education Policy, Constitutional Law'}</p>
                </div>
              </div>
            </section>
          </div>

          <section className="bg-white rounded-lg border border-slate-200 shadow p-6" data-testid="profile-settings-section">
            <h2 className="text-xl font-semibold mb-4" data-testid="profile-settings-title">Settings</h2>
            <div className="space-y-4" data-testid="profile-settings-content">
              <div data-testid="profile-preferences">
                <h3 className="text-lg font-medium">Preferences</h3>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between" data-testid="profile-dark-mode">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-slate-500">Enable dark mode theme</p>
                    </div>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                      data-testid="profile-dark-mode-switch"
                    />
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
                  <div className="flex items-center justify-between" data-testid="profile-comment-responses">
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
                  <div className="flex items-center justify-between" data-testid="profile-public-profile">
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
                  <div className="flex items-center justify-between" data-testid="profile-show-expertise">
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
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
