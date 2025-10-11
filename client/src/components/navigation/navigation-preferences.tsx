import React, { useState } from 'react';
import { Settings, Home, Star, Clock, Layout, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigation } from '@/contexts/NavigationContext';
import { NavigationPreferences } from '@/types/navigation';
import { logger } from '../utils/logger.js';

interface NavigationPreferencesProps {
  onClose?: () => void;
}

const NavigationPreferencesComponent: React.FC<NavigationPreferencesProps> = ({ onClose }) => {
  const { preferences, updatePreferences } = useNavigation();
  const [localPreferences, setLocalPreferences] = useState<NavigationPreferences>(preferences);

  const handleSave = () => {
    updatePreferences(localPreferences);
    onClose?.();
  };

  const handleReset = () => {
    const defaultPreferences: NavigationPreferences = {
      defaultLandingPage: '/',
      favoritePages: [],
      recentlyVisited: [],
      compactMode: false,
    };
    setLocalPreferences(defaultPreferences);
  };

  const landingPageOptions = [
    { value: '/', label: 'Home', icon: <Home className="h-4 w-4" /> },
    { value: '/dashboard', label: 'Dashboard', icon: <Layout className="h-4 w-4" /> },
    { value: '/bills', label: 'Bills', icon: <Star className="h-4 w-4" /> },
  ];

  const removeFavoritePage = (pageToRemove: string) => {
    setLocalPreferences(prev => ({
      ...prev,
      favoritePages: prev.favoritePages.filter(page => page !== pageToRemove)
    }));
  };

  const clearRecentPages = () => {
    setLocalPreferences(prev => ({
      ...prev,
      recentlyVisited: []
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Navigation Preferences</h2>
          <p className="text-muted-foreground">
            Customize your navigation experience and default behaviors
          </p>
        </div>
        <Settings className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="grid gap-6">
        {/* Default Landing Page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Default Landing Page
            </CardTitle>
            <CardDescription>
              Choose which page to show when you first visit the app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="landing-page">Landing Page</Label>
              <Select
                value={localPreferences.defaultLandingPage}
                onValueChange={(value) => 
                  setLocalPreferences(prev => ({ ...prev, defaultLandingPage: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default page" />
                </SelectTrigger>
                <SelectContent>
                  {landingPageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Display Options
            </CardTitle>
            <CardDescription>
              Adjust how navigation elements are displayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use smaller navigation elements to save space
                  </p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={localPreferences.compactMode}
                  onCheckedChange={(checked) =>
                    setLocalPreferences(prev => ({ ...prev, compactMode: checked }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favorite Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Favorite Pages
            </CardTitle>
            <CardDescription>
              Manage your favorite pages for quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {localPreferences.favoritePages.length > 0 ? (
                <div className="space-y-2">
                  <Label>Current Favorites</Label>
                  <div className="flex flex-wrap gap-2">
                    {localPreferences.favoritePages.map((page) => (
                      <Badge
                        key={page}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {page}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeFavoritePage(page)}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No favorite pages yet. Star pages while browsing to add them here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recently Visited */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Visited
            </CardTitle>
            <CardDescription>
              View and manage your browsing history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {localPreferences.recentlyVisited.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Recent Pages ({localPreferences.recentlyVisited.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearRecentPages}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {localPreferences.recentlyVisited.map((page, index) => (
                      <div
                        key={`${page.path}-${index}`}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{page.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{page.path}</p>
                        </div>
                        <div className="text-xs text-muted-foreground ml-2">
                          {page.visitCount} visit{page.visitCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent pages yet. Your browsing history will appear here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NavigationPreferencesComponent;