/**
 * Dashboard Preferences Modal Component
 * 
 * Allows users to customize their dashboard layout and preferences.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { 
  Settings, 
  Layout, 
  Clock, 
  Eye,
  EyeOff,
  Grid,
  List,
  Maximize,
  RefreshCw
} from 'lucide-react';
import { DashboardPreferences } from '@client/types/user-dashboard';

interface DashboardPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: DashboardPreferences;
  onUpdate: (preferences: Partial<DashboardPreferences>) => void;
}

export function DashboardPreferencesModal({
  open,
  onOpenChange,
  preferences,
  onUpdate
}: DashboardPreferencesModalProps) {
  const [localPreferences, setLocalPreferences] = useState<DashboardPreferences>(preferences);

  const layoutOptions = [
    {
      value: 'compact' as const,
      label: 'Compact',
      description: 'Dense layout with smaller cards',
      icon: <List className="h-4 w-4" />
    },
    {
      value: 'detailed' as const,
      label: 'Detailed',
      description: 'Expanded layout with more information',
      icon: <Maximize className="h-4 w-4" />
    },
    {
      value: 'cards' as const,
      label: 'Cards',
      description: 'Balanced card-based layout',
      icon: <Grid className="h-4 w-4" />
    }
  ];

  const timeFilterOptions = [
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ] as const;

  const availableSections = [
    { id: 'tracked-bills', label: 'Tracked Bills', description: 'Bills you are following' },
    { id: 'civic-metrics', label: 'Civic Metrics', description: 'Your engagement scores and achievements' },
    { id: 'recommendations', label: 'Recommendations', description: 'AI-powered bill suggestions' },
    { id: 'recent-activity', label: 'Recent Activity', description: 'Your engagement history' },
    { id: 'notifications', label: 'Notifications', description: 'Updates and alerts' },
    { id: 'achievements', label: 'Achievements', description: 'Your civic engagement milestones' }
  ];

  const handleLayoutChange = (layout: DashboardPreferences['layout']) => {
    setLocalPreferences(prev => ({ ...prev, layout }));
  };

  const handleTimeFilterChange = (defaultTimeFilter: DashboardPreferences['defaultTimeFilter']) => {
    setLocalPreferences(prev => ({ ...prev, defaultTimeFilter }));
  };

  const handleRefreshIntervalChange = (value: string) => {
    const refreshInterval = parseInt(value, 10);
    if (!isNaN(refreshInterval) && refreshInterval >= 0) {
      setLocalPreferences(prev => ({ ...prev, refreshInterval }));
    }
  };

  const handleWelcomeMessageToggle = (showWelcomeMessage: boolean) => {
    setLocalPreferences(prev => ({ ...prev, showWelcomeMessage }));
  };

  const handleSectionToggle = (sectionId: string, isPinned: boolean) => {
    setLocalPreferences(prev => {
      if (isPinned) {
        // Add to pinned, remove from hidden
        return {
          ...prev,
          pinnedSections: [...prev.pinnedSections.filter(id => id !== sectionId), sectionId],
          hiddenSections: prev.hiddenSections.filter(id => id !== sectionId)
        };
      } else {
        // Remove from pinned, add to hidden
        return {
          ...prev,
          pinnedSections: prev.pinnedSections.filter(id => id !== sectionId),
          hiddenSections: [...prev.hiddenSections.filter(id => id !== sectionId), sectionId]
        };
      }
    });
  };

  const handleSave = () => {
    onUpdate(localPreferences);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultPreferences: DashboardPreferences = {
      layout: 'cards',
      showWelcomeMessage: true,
      defaultTimeFilter: 'month',
      pinnedSections: ['tracked-bills', 'civic-metrics'],
      hiddenSections: [],
      refreshInterval: 15
    };
    setLocalPreferences(defaultPreferences);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dashboard Preferences
          </DialogTitle>
          <DialogDescription>
            Customize your dashboard layout and default settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Layout Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Layout Style
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how information is displayed on your dashboard.
              </p>
            </div>

            <Select
              value={localPreferences.layout}
              onValueChange={handleLayoutChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layoutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Filter Default */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Default Time Filter
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set the default time period for activity and metrics.
              </p>
            </div>

            <Select
              value={localPreferences.defaultTimeFilter}
              onValueChange={handleTimeFilterChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-refresh Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-refresh
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set how often the dashboard should automatically refresh (in minutes). Set to 0 to disable.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                max="60"
                value={localPreferences.refreshInterval}
                onChange={(e) => handleRefreshIntervalChange(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Display Options</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Control what elements are shown on your dashboard.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="welcome-message" className="font-medium">
                    Show Welcome Message
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display personalized greeting and tips
                  </p>
                </div>
                <Switch
                  id="welcome-message"
                  checked={localPreferences.showWelcomeMessage}
                  onCheckedChange={handleWelcomeMessageToggle}
                />
              </div>
            </div>
          </div>

          {/* Section Visibility */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Dashboard Sections</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which sections to display on your dashboard overview.
              </p>
            </div>

            <div className="space-y-3">
              {availableSections.map((section) => {
                const isPinned = localPreferences.pinnedSections.includes(section.id);
                const isHidden = localPreferences.hiddenSections.includes(section.id);
                const isVisible = isPinned || (!isPinned && !isHidden);

                return (
                  <div
                    key={section.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={section.id}
                        checked={isVisible}
                        onCheckedChange={(checked) => 
                          handleSectionToggle(section.id, checked as boolean)
                        }
                      />
                      <div>
                        <Label htmlFor={section.id} className="font-medium">
                          {section.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    
                    {isPinned && (
                      <div className="text-xs text-civic-community font-medium">
                        Pinned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}