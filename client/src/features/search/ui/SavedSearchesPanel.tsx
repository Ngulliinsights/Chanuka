import React, { useState } from 'react';
import { Star, Bell, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Switch } from '@client/lib/design-system';
import {
  searchHistoryService,
  SavedSearch,
} from '@client/features/search/services/search-history-service';
import { useToast } from '@client/lib/hooks/use-toast';

interface SavedSearchesPanelProps {
  onExecuteSearch: (query: string, filters?: Record<string, any>) => void;
}

export function SavedSearchesPanel({ onExecuteSearch }: SavedSearchesPanelProps) {
  const [searches, setSearches] = useState<SavedSearch[]>(searchHistoryService.getSavedSearches());
  const { toast } = useToast();

  const handleToggleAlerts = (id: string, enabled: boolean) => {
    searchHistoryService.updateSavedSearch(id, { alertsEnabled: enabled });
    setSearches(searchHistoryService.getSavedSearches());

    toast({
      title: enabled ? 'Alerts enabled' : 'Alerts disabled',
      description: enabled ? "You'll be notified of new results" : 'Alerts turned off',
    });
  };

  const handleDelete = (id: string) => {
    searchHistoryService.deleteSavedSearch(id);
    setSearches(searchHistoryService.getSavedSearches());

    toast({
      title: 'Search deleted',
      description: 'Saved search removed',
    });
  };

  const handleExecute = (search: SavedSearch) => {
    onExecuteSearch(search.query, search.filters);
  };

  if (searches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No saved searches yet</p>
          <p className="text-sm text-gray-500 mt-1">Save searches to quickly access them later</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Searches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {searches.map(search => (
            <div
              key={search.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{search.name}</h4>
                  {search.alertsEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      <Bell className="h-3 w-3 mr-1" />
                      Alerts
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{search.query}</p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm" onClick={() => handleExecute(search)}>
                  <Search className="h-4 w-4" />
                </Button>

                <Switch
                  checked={search.alertsEnabled}
                  onCheckedChange={checked => handleToggleAlerts(search.id, checked)}
                />

                <Button variant="ghost" size="sm" onClick={() => handleDelete(search.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
