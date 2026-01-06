/**
 * DashboardCustomizer Widget
 *
 * Allows users to customize their dashboard layout, widget visibility,
 * and preferences based on their persona type.
 */

import {
  LayoutGrid as Layout, // Using LayoutGrid as Layout replacement
  // Eye, // Unused
  // EyeOff, // Unused
  Settings,
  Grid3X3 as Grid, // Using Grid3X3 as Grid replacement
  List,
  LayoutGrid as Columns, // Using LayoutGrid as Columns replacement
  Save,
  RefreshCw as RotateCcw, // Using RefreshCw as RotateCcw replacement
  // Settings as Palette, // Using Settings as Palette replacement - Unused
  // Bell, // Unused
  // Clock // Unused
} from 'lucide-react';
import { useState } from 'react';
import React from 'react';

// import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system'; // Unused
import type { PersonaType, PersonaPreferences } from '@client/core/personalization/types';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Switch } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/shared/design-system';

interface DashboardCustomizerProps {
  persona: PersonaType;
  preferences: PersonaPreferences | null;
  expandedSections: Set<string>;
  hiddenWidgets: Set<string>;
  onPreferencesUpdate: (preferences: Partial<PersonaPreferences>) => void;
  onSectionToggle: (sectionId: string) => void;
  onWidgetToggle: (widgetId: string) => void;
  className?: string;
}

interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'engagement' | 'analytics' | 'tools';
  availableFor: PersonaType[];
  defaultVisible: boolean;
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  // Core widgets available to all personas
  {
    id: 'welcome',
    name: 'Welcome Message',
    description: 'Personalized greeting and getting started guide',
    category: 'core',
    availableFor: ['novice', 'intermediate', 'expert'],
    defaultVisible: true,
  },
  {
    id: 'progress',
    name: 'Progress Tracker',
    description: 'Your civic engagement journey progress',
    category: 'core',
    availableFor: ['novice', 'intermediate', 'expert'],
    defaultVisible: true,
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'Fast access to common tasks',
    category: 'core',
    availableFor: ['novice', 'intermediate', 'expert'],
    defaultVisible: true,
  },

  // Engagement widgets
  {
    id: 'popular-bills',
    name: 'Popular Bills',
    description: 'Trending legislation this week',
    category: 'engagement',
    availableFor: ['novice', 'intermediate'],
    defaultVisible: true,
  },
  {
    id: 'tracked-bills',
    name: 'Tracked Bills',
    description: 'Bills you are following',
    category: 'engagement',
    availableFor: ['intermediate', 'expert'],
    defaultVisible: true,
  },
  {
    id: 'community-engagement',
    name: 'Community Discussions',
    description: 'Active community conversations',
    category: 'engagement',
    availableFor: ['intermediate', 'expert'],
    defaultVisible: true,
  },
  {
    id: 'civic-education',
    name: 'Civic Education',
    description: 'Learn how government works',
    category: 'engagement',
    availableFor: ['novice'],
    defaultVisible: true,
  },

  // Analytics widgets
  {
    id: 'activity-summary',
    name: 'Activity Summary',
    description: 'Your civic engagement statistics',
    category: 'analytics',
    availableFor: ['intermediate', 'expert'],
    defaultVisible: true,
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Professional legislative intelligence',
    category: 'analytics',
    availableFor: ['expert'],
    defaultVisible: true,
  },
  {
    id: 'performance-metrics',
    name: 'Performance Metrics',
    description: 'Your contribution impact metrics',
    category: 'analytics',
    availableFor: ['expert'],
    defaultVisible: true,
  },

  // Tools widgets
  {
    id: 'expert-tools',
    name: 'Expert Tools',
    description: 'Professional analysis and verification tools',
    category: 'tools',
    availableFor: ['expert'],
    defaultVisible: true,
  },
  {
    id: 'verification-queue',
    name: 'Verification Queue',
    description: 'Pending expert verifications',
    category: 'tools',
    availableFor: ['expert'],
    defaultVisible: true,
  },
  {
    id: 'workaround-detection',
    name: 'Workaround Detection',
    description: 'Constitutional workaround monitoring',
    category: 'tools',
    availableFor: ['expert'],
    defaultVisible: false,
  },
];

export function DashboardCustomizer({
  persona,
  preferences,
  expandedSections: _expandedSections,
  hiddenWidgets,
  onPreferencesUpdate,
  onSectionToggle: _onSectionToggle,
  onWidgetToggle,
  className = '',
}: DashboardCustomizerProps) {
  const [hasChanges, setHasChanges] = useState(false);

  // Filter widgets available for current persona
  const availableWidgets = AVAILABLE_WIDGETS.filter(widget =>
    widget.availableFor.includes(persona)
  );

  const handlePreferenceChange = (key: keyof PersonaPreferences, value: any) => {
    onPreferencesUpdate({ [key]: value });
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    // In a real app, this would save to the backend
    setHasChanges(false);
  };

  const handleResetToDefaults = () => {
    // Reset all widgets to default visibility
    availableWidgets.forEach(widget => {
      const shouldBeVisible = widget.defaultVisible;
      const isCurrentlyHidden = hiddenWidgets.has(widget.id);

      if (shouldBeVisible && isCurrentlyHidden) {
        onWidgetToggle(widget.id);
      } else if (!shouldBeVisible && !isCurrentlyHidden) {
        onWidgetToggle(widget.id);
      }
    });

    // Reset preferences to defaults
    const defaultPrefs = {
      defaultView: persona === 'novice' ? 'cards' : persona === 'intermediate' ? 'list' : 'grid',
      notificationFrequency:
        persona === 'novice' ? 'weekly' : persona === 'intermediate' ? 'daily' : 'immediate',
      contentComplexity:
        persona === 'novice' ? 'simple' : persona === 'intermediate' ? 'detailed' : 'technical',
      dashboardLayout:
        persona === 'novice' ? 'compact' : persona === 'intermediate' ? 'standard' : 'expanded',
    } as Partial<PersonaPreferences>;

    onPreferencesUpdate(defaultPrefs);
    setHasChanges(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core':
        return <Layout className="h-4 w-4" />;
      case 'engagement':
        return <Grid className="h-4 w-4" />;
      case 'analytics':
        return <Settings className="h-4 w-4" />;
      case 'tools':
        return <Columns className="h-4 w-4" />;
      default:
        return <Layout className="h-4 w-4" />;
    }
  };

  return (
    <div className={`dashboard-customizer ${className}`}>
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Layout Customization */}
        <TabsContent value="layout" className="space-y-4 mt-4">
          <div>
            <h4 className="font-medium mb-3">Dashboard Layout</h4>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={preferences?.dashboardLayout === 'compact' ? 'primary' : 'outline'}
                className="h-auto p-3 flex-col"
                onClick={() => handlePreferenceChange('dashboardLayout', 'compact')}
              >
                <List className="h-6 w-6 mb-2" />
                <span className="text-xs">Compact</span>
              </Button>
              <Button
                variant={preferences?.dashboardLayout === 'standard' ? 'primary' : 'outline'}
                className="h-auto p-3 flex-col"
                onClick={() => handlePreferenceChange('dashboardLayout', 'standard')}
              >
                <Grid className="h-6 w-6 mb-2" />
                <span className="text-xs">Standard</span>
              </Button>
              <Button
                variant={preferences?.dashboardLayout === 'expanded' ? 'primary' : 'outline'}
                className="h-auto p-3 flex-col"
                onClick={() => handlePreferenceChange('dashboardLayout', 'expanded')}
              >
                <Columns className="h-6 w-6 mb-2" />
                <span className="text-xs">Expanded</span>
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Default View Style</h4>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={preferences?.defaultView === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handlePreferenceChange('defaultView', 'list')}
              >
                List View
              </Button>
              <Button
                variant={preferences?.defaultView === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handlePreferenceChange('defaultView', 'grid')}
              >
                Grid View
              </Button>
              <Button
                variant={preferences?.defaultView === 'cards' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handlePreferenceChange('defaultView', 'cards')}
              >
                Card View
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Widget Management */}
        <TabsContent value="widgets" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Visible Widgets</h4>
            <Badge variant="secondary">
              {availableWidgets.length - hiddenWidgets.size} of {availableWidgets.length} visible
            </Badge>
          </div>

          <div className="space-y-3">
            {['core', 'engagement', 'analytics', 'tools'].map(category => {
              const categoryWidgets = availableWidgets.filter(w => w.category === category);
              if (categoryWidgets.length === 0) return null;

              return (
                <div key={category}>
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2 capitalize">
                    {getCategoryIcon(category)}
                    {category} Widgets
                  </h5>
                  <div className="space-y-2">
                    {categoryWidgets.map(widget => (
                      <div
                        key={widget.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h6 className="font-medium text-sm">{widget.name}</h6>
                            {!widget.defaultVisible && (
                              <Badge variant="outline" className="text-xs">
                                Optional
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{widget.description}</p>
                        </div>
                        <Switch
                          checked={!hiddenWidgets.has(widget.id)}
                          onCheckedChange={() => {
                            onWidgetToggle(widget.id);
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-4 mt-4">
          <div>
            <h4 className="font-medium mb-3">Notification Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Notification Frequency</p>
                  <p className="text-xs text-muted-foreground">How often you receive updates</p>
                </div>
                <Select
                  value={preferences?.notificationFrequency || 'daily'}
                  onValueChange={value => handlePreferenceChange('notificationFrequency', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Content Complexity</p>
                  <p className="text-xs text-muted-foreground">Level of detail in explanations</p>
                </div>
                <Select
                  value={preferences?.contentComplexity || 'detailed'}
                  onValueChange={value => handlePreferenceChange('contentComplexity', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {persona === 'expert' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Expert Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Show advanced features and tools
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.enableExpertMode || false}
                    onCheckedChange={checked => handlePreferenceChange('enableExpertMode', checked)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Advanced Features</p>
                  <p className="text-xs text-muted-foreground">
                    Show advanced search and analysis tools
                  </p>
                </div>
                <Switch
                  checked={preferences?.showAdvancedFeatures || false}
                  onCheckedChange={checked =>
                    handlePreferenceChange('showAdvancedFeatures', checked)
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t mt-6">
        <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>

        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="mr-2">
              Unsaved changes
            </Badge>
          )}
          <Button size="sm" onClick={handleSaveChanges} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
