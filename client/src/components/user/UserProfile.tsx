/**
 * User Profile Component
 * Comprehensive user profile management with settings, preferences, and privacy controls
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
// Import only the icons we actually use, with proper handling for potential import issues
import {
  User,
  Image,
  Save,
  Shield,
  Lock,
  Eye,
  Download,
  Trash,
  CheckCircle,
  Settings
} from 'lucide-react';
import { LoadingSpinner } from '../ui/loading-spinner';
import { toast } from 'sonner';
import { UserProfile as UserProfileType, UserPreferences } from '../../services/userProfileService';

/**
 * Custom hook to manage user profile state
 * This encapsulates all profile-related API calls and state management
 * Replaces the missing useUserStore with a clean, reusable hook
 */
function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches the current user's profile and preferences from the API
   * This should be called when the component mounts or when we need to refresh data
   */
  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // In production, replace this with your actual API endpoint
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data.profile);
      setPreferences(data.preferences);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates the user's profile with partial data
   * Only the fields provided in 'updates' will be changed
   */
  const updateProfile = async (updates: Partial<UserProfileType>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates user preferences
   * Handles notification settings, theme preferences, etc.
   */
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Uploads a new avatar image
   * Accepts a File object and sends it as FormData
   */
  const uploadAvatar = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload avatar');
      const data = await response.json();
      // Update the profile with the new avatar URL
      setProfile(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profile,
    preferences,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    updatePreferences,
    uploadAvatar
  };
}

interface UserProfileProps {
  className?: string;
}

export function UserProfile({ className }: UserProfileProps) {
  const { user, isAuthenticated, updatePrivacySettings, requestDataExport, requestDataDeletion } = useAuth();
  const {
    profile,
    preferences,
    fetchProfile,
    updateProfile,
    updatePreferences,
    uploadAvatar
  } = useUserProfile();

  // UI state management
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form states with proper typing
  const [profileForm, setProfileForm] = useState<Partial<UserProfileType>>({});
  const [preferencesForm, setPreferencesForm] = useState<Partial<UserPreferences>>({});
  const [privacyForm, setPrivacyForm] = useState<{
    profile_visibility?: 'public' | 'registered' | 'private';
    activity_tracking?: boolean;
    analytics_consent?: boolean;
    personalized_content?: boolean;
  }>({});

  // Fetch profile data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfile();
    }
  }, [isAuthenticated, user]);

  // Sync profile data to form state when it loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        twitter: profile.twitter,
        linkedin: profile.linkedin
      });
    }
  }, [profile]);

  // Sync preferences to form state
  useEffect(() => {
    if (preferences) {
      setPreferencesForm(preferences);
    }
  }, [preferences]);

  // Sync privacy settings to form state
  useEffect(() => {
    if (user?.privacy_settings) {
      setPrivacyForm(user.privacy_settings);
    }
  }, [user]);

  /**
   * Handles avatar file selection and creates a preview
   * Uses FileReader to convert the image to a data URL for preview
   */
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Saves profile changes including avatar upload if a new image was selected
   */
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // First upload avatar if one was selected
      if (avatarFile) {
        await uploadAvatar(avatarFile);
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      // Then update profile fields if any were changed
      if (Object.keys(profileForm).length > 0) {
        await updateProfile(profileForm);
      }

      setIsEditing(false);
      toast.success("Profile Updated", {
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast.error("Update Failed", {
        description: error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Saves user preference changes
   */
  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await updatePreferences(preferencesForm);
      toast.success("Preferences Updated", {
        description: "Your preferences have been successfully updated.",
      });
    } catch (error) {
      toast.error("Update Failed", {
        description: error instanceof Error ? error.message : "Failed to update preferences",
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Saves privacy setting changes
   */
  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await updatePrivacySettings(privacyForm);
      toast.success("Privacy Settings Updated", {
        description: "Your privacy settings have been successfully updated.",
      });
    } catch (error) {
      toast.error("Update Failed", {
        description: error instanceof Error ? error.message : "Failed to update privacy settings",
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Requests a data export for the user
   * The user will receive an email when their data is ready for download
   */
  const handleExportData = async () => {
    try {
      await requestDataExport('json', ['profile', 'bills', 'comments', 'engagement']);
      toast.success("Data Export Requested", {
        description: "Your data export has been requested. You'll receive an email when it's ready.",
      });
    } catch (error) {
      toast.error("Export Failed", {
        description: error instanceof Error ? error.message : "Failed to request data export",
      });
    }
  };

  /**
   * Initiates account deletion process
   * Shows confirmation dialog and requests immediate deletion
   */
  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await requestDataDeletion('immediate', ['all']);
        toast.success("Account Deletion Requested", {
          description: "Your account deletion has been requested. You'll receive confirmation via email.",
        });
      } catch (error) {
        toast.error("Deletion Failed", {
          description: error instanceof Error ? error.message : "Failed to request account deletion",
        });
      }
    }
  };

  /**
   * Generates user initials from their name for the avatar fallback
   * Takes the first letter of each word, up to 2 letters
   */
  const getUserInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Helper function to update notification preferences
   * This ensures we always have all required fields and avoids duplicate property errors
   */
  const updateNotificationPreference = (key: keyof UserPreferences['notification_preferences'], value: boolean) => {
    setPreferencesForm(prev => {
      // Get the current notification preferences or create default ones
      const currentPrefs = prev.notification_preferences || {
        email_notifications: false,
        push_notifications: false,
        sms_notifications: false,
        bill_updates: false,
        comment_replies: false,
        expert_insights: false,
        security_alerts: true,
        privacy_updates: false
      };

      // Return the updated preferences with the single changed value
      return {
        ...prev,
        notification_preferences: {
          ...currentPrefs,
          [key]: value
        }
      };
    });
  };

  // Show sign-in prompt if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your profile settings.
              </p>
              <Button onClick={() => window.location.href = '/auth'}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, preferences, and privacy settings
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsEditing(!isEditing)}
          disabled={isSaving}
        >
          <Settings className="h-4 w-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your public profile information and social links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={avatarPreview || profile?.avatar_url} 
                      alt={profile?.name || user.name} 
                    />
                    <AvatarFallback className="text-lg">
                      {getUserInitials(profile?.name || user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <label 
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      htmlFor="avatar-upload"
                      aria-label="Upload new profile picture"
                    >
                      <Image className="h-6 w-6 text-white" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{profile?.name || user.name}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                    {user.verification_status === 'verified' && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Profile Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name || ''}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileForm.location || ''}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="City, Country"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio || ''}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profileForm.website || ''}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={profileForm.twitter || ''}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, twitter: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={profileForm.linkedin || ''}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, linkedin: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize how the platform looks and behaves for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={preferencesForm.theme || 'system'}
                    onValueChange={(value) => setPreferencesForm(prev => ({ ...prev, theme: value as 'light' | 'dark' | 'system' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={preferencesForm.language || 'en'}
                    onValueChange={(value) => setPreferencesForm(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dashboard Layout</Label>
                  <Select
                    value={preferencesForm.dashboard_layout || 'comfortable'}
                    onValueChange={(value) => setPreferencesForm(prev => ({ ...prev, dashboard_layout: value as 'compact' | 'comfortable' | 'spacious' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Bill View</Label>
                  <Select
                    value={preferencesForm.default_bill_view || 'grid'}
                    onValueChange={(value) => setPreferencesForm(prev => ({ ...prev, default_bill_view: value as 'grid' | 'list' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Notification Preferences Section */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Preferences</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={preferencesForm.notification_preferences?.email_notifications ?? false}
                      onCheckedChange={(checked) => updateNotificationPreference('email_notifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Bill Updates</Label>
                      <p className="text-sm text-muted-foreground">Get notified when tracked bills are updated</p>
                    </div>
                    <Switch
                      checked={preferencesForm.notification_preferences?.bill_updates ?? false}
                      onCheckedChange={(checked) => updateNotificationPreference('bill_updates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Comment Replies</Label>
                      <p className="text-sm text-muted-foreground">Get notified when someone replies to your comments</p>
                    </div>
                    <Switch
                      checked={preferencesForm.notification_preferences?.comment_replies ?? false}
                      onCheckedChange={(checked) => updateNotificationPreference('comment_replies', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">Important security notifications</p>
                    </div>
                    <Switch
                      checked={preferencesForm.notification_preferences?.security_alerts ?? true}
                      onCheckedChange={(checked) => updateNotificationPreference('security_alerts', checked)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePreferences} disabled={isSaving}>
                {isSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Who can see your profile information</p>
                  </div>
                  <Select
                    value={privacyForm.profile_visibility || 'public'}
                    onValueChange={(value: 'public' | 'registered' | 'private') => 
                      setPrivacyForm(prev => ({ ...prev, profile_visibility: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="registered">Registered Users</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activity Tracking</Label>
                    <p className="text-sm text-muted-foreground">Allow tracking of your platform activity</p>
                  </div>
                  <Switch
                    checked={privacyForm.activity_tracking ?? true}
                    onCheckedChange={(checked) => 
                      setPrivacyForm(prev => ({ ...prev, activity_tracking: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Analytics Consent</Label>
                    <p className="text-sm text-muted-foreground">Help improve the platform with usage analytics</p>
                  </div>
                  <Switch
                    checked={privacyForm.analytics_consent ?? false}
                    onCheckedChange={(checked) => 
                      setPrivacyForm(prev => ({ ...prev, analytics_consent: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Personalized Content</Label>
                    <p className="text-sm text-muted-foreground">Show personalized recommendations</p>
                  </div>
                  <Switch
                    checked={privacyForm.personalized_content ?? true}
                    onCheckedChange={(checked) => 
                      setPrivacyForm(prev => ({ ...prev, personalized_content: checked }))
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Data Management Section */}
              <div className="space-y-4">
                <h4 className="font-medium">Data Management</h4>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Export Your Data</Label>
                    <p className="text-sm text-muted-foreground">Download a copy of your data</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
                  <div>
                    <Label className="text-red-600">Delete Account</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>

              <Button onClick={handleSavePrivacy} disabled={isSaving}>
                {isSaving ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      {user.two_factor_enabled ? 'Enabled' : 'Add an extra layer of security'}
                    </p>
                  </div>
                  <Button variant={user.two_factor_enabled ? "destructive" : "default"}>
                    <Shield className="h-4 w-4 mr-2" />
                    {user.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Change Password</Label>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Active Sessions</Label>
                    <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
                  </div>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Sessions
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Security Events Section */}
              <div className="space-y-4">
                <h4 className="font-medium">Security Events</h4>
                <p className="text-sm text-muted-foreground">
                  Recent security-related activities on your account
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm">Successful login</p>
                      <p className="text-xs text-muted-foreground">2 hours ago from Chrome on Windows</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm">Password changed</p>
                      <p className="text-xs text-muted-foreground">1 week ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UserProfile;