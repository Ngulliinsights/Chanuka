/**
 * Saved Searches Component
 * 
 * Manages saved searches with email alert configuration and execution.
 */

import React, { useState } from 'react';
import {
  Search,
  Star,
  Mail,
  Play,
  Edit,
  Trash2,
  Plus,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSavedSearches } from '../hooks/useSearch';
import { intelligentSearch } from '../services/intelligent-search';
import { format } from 'date-fns';
import type { SavedSearch } from '../types';

interface SavedSearchesProps {
  onExecuteSearch?: (search: SavedSearch) => void;
  className?: string;
}

interface EmailAlertConfig {
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  threshold: number;
}

export function SavedSearches({
  onExecuteSearch,
  className = ''
}: SavedSearchesProps) {
  const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<EmailAlertConfig>({
    enabled: false,
    frequency: 'daily',
    threshold: 1
  });

  const { toast } = useToast();
  const { savedSearches, deleteSavedSearch, executeSavedSearch } = useSavedSearches();

  const handleExecuteSearch = async (search: SavedSearch) => {
    try {
      if (onExecuteSearch) {
        onExecuteSearch(search);
      } else {
        await executeSavedSearch.mutateAsync(search.id);
      }
      
      toast({
        title: "Search Executed",
        description: `"${search.name}" search has been executed.`
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Failed to execute saved search.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSearch = async (search: SavedSearch) => {
    try {
      await deleteSavedSearch.mutateAsync(search.id);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleConfigureAlerts = (search: SavedSearch) => {
    setSelectedSearch(search);
    // Load existing alert config if available
    setAlertConfig({
      enabled: search.emailAlerts?.enabled || false,
      frequency: search.emailAlerts?.frequency || 'daily',
      threshold: search.emailAlerts?.threshold || 1
    });
    setAlertDialogOpen(true);
  };

  const handleSaveAlertConfig = async () => {
    if (!selectedSearch) return;

    try {
      await intelligentSearch.saveSearchWithAlerts({
        name: selectedSearch.name,
        query: selectedSearch.query,
        emailAlerts: alertConfig,
        isPublic: selectedSearch.is_public
      });

      toast({
        title: "Alert Settings Saved",
        description: `Email alerts ${alertConfig.enabled ? 'enabled' : 'disabled'} for "${selectedSearch.name}".`
      });

      setAlertDialogOpen(false);
      setSelectedSearch(null);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save alert settings.",
        variant: "destructive"
      });
    }
  };

  if (savedSearches.isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading saved searches...</p>
        </CardContent>
      </Card>
    );
  }

  if (savedSearches.error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Failed to load saved searches</p>
        </CardContent>
      </Card>
    );
  }

  const searches = savedSearches.data || [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Saved Searches</span>
            <Badge variant="secondary">{searches.length}</Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {searches.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No saved searches</h3>
            <p className="text-muted-foreground">
              Save your searches to quickly access them later and set up email alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <Card key={search.id} className="border-l-4 border-l-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium truncate">{search.name}</h4>
                        {search.is_public && (
                          <Badge variant="outline" className="text-xs">Public</Badge>
                        )}
                        {search.emailAlerts?.enabled && (
                          <Badge variant="secondary" className="text-xs flex items-center">
                            <Bell className="h-3 w-3 mr-1" />
                            Alerts
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        Query: {search.query.q}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Created {format(new Date(search.created_at), 'MMM d, yyyy')}</span>
                        <span>Used {search.useCount} times</span>
                        {search.lastUsed && (
                          <span>Last used {format(new Date(search.lastUsed), 'MMM d')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecuteSearch(search)}
                        disabled={executeSavedSearch.isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigureAlerts(search)}
                      >
                        {search.emailAlerts?.enabled ? (
                          <Bell className="h-3 w-3" />
                        ) : (
                          <BellOff className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSearch(search)}
                        disabled={deleteSavedSearch.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Email Alert Configuration Dialog */}
        <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Email Alerts</DialogTitle>
            </DialogHeader>
            
            {selectedSearch && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Search: {selectedSearch.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new results match your saved search.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Email Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications for new matching results
                    </p>
                  </div>
                  <Switch
                    checked={alertConfig.enabled}
                    onCheckedChange={(checked) =>
                      setAlertConfig(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                {alertConfig.enabled && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Alert Frequency</Label>
                        <Select
                          value={alertConfig.frequency}
                          onValueChange={(value: 'immediate' | 'daily' | 'weekly') =>
                            setAlertConfig(prev => ({ ...prev, frequency: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                            <SelectItem value="weekly">Weekly Summary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Results Threshold</Label>
                        <Select
                          value={alertConfig.threshold.toString()}
                          onValueChange={(value) =>
                            setAlertConfig(prev => ({ ...prev, threshold: parseInt(value) }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 or more new results</SelectItem>
                            <SelectItem value="5">5 or more new results</SelectItem>
                            <SelectItem value="10">10 or more new results</SelectItem>
                            <SelectItem value="25">25 or more new results</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Only send alerts when at least this many new results are found
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAlertConfig}>
                    Save Alert Settings
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default SavedSearches;