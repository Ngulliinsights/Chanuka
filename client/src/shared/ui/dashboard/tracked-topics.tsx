import { AlertCircle, CheckCircle, Edit, RefreshCw, Search, Star as Tag, X } from 'lucide-react';
import React from 'react';

import type { TopicCategory } from '@/shared/types/dashboard';

import { Button, Card, CardContent, CardHeader, Input } from '../../design-system';

import { useDashboard, useDashboardTopics } from './hooks';
import type { DashboardComponentProps } from './types';
import { validateTrackedTopic } from './validation';

export const TrackedTopics = React.memo<DashboardComponentProps>(
  ({ className = '', config, onError, onDataChange }) => {
    // Fixed: Removed invalid properties 'id' and 'name' from default config to satisfy Partial<DashboardConfig> type
    const { data, loading, error, actions, recovery } = useDashboard(config || {});
    const { operations: topicOps } = useDashboardTopics(data.trackedTopics);

    const [isEditing, setIsEditing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState<TopicCategory | 'all'>('all');
    const [newTopicName, setNewTopicName] = React.useState('');
    const [newTopicCategory, setNewTopicCategory] = React.useState<TopicCategory>(
      'healthcare' as TopicCategory
    );
    const [isAddingTopic, setIsAddingTopic] = React.useState(false);

    // Handle error reporting
    React.useEffect(() => {
      if (error && onError) {
        onError(error);
      }
    }, [error, onError]);

    // Handle data change notifications
    React.useEffect(() => {
      if (onDataChange && data.trackedTopics) {
        onDataChange({ trackedTopics: data.trackedTopics });
      }
    }, [data.trackedTopics, onDataChange]);

    // Filter and validate topics
    const filteredTopics = React.useMemo(() => {
      if (!data.trackedTopics) return [];

      let topics = data.trackedTopics;

      // Apply search filter
      if (searchQuery.trim()) {
        topics = topicOps.searchTopics(searchQuery);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        topics = topics.filter(topic => topic.category === categoryFilter);
      }

      // Validate topics
      return topics.map(topic => {
        try {
          return validateTrackedTopic(topic);
        } catch (validationError) {
          console.warn('Tracked topic validation failed:', validationError);
          return topic; // Use unvalidated topic as fallback
        }
      });
    }, [data.trackedTopics, searchQuery, categoryFilter, topicOps]);

    const handleAddTopic = async () => {
      if (!newTopicName.trim()) return;

      setIsAddingTopic(true);
      try {
        await actions.addTopic({
          name: newTopicName.trim(),
          category: newTopicCategory,
          billCount: 0,
          is_active: true,
          description: `Topic: ${newTopicName.trim()}`,
        });

        setNewTopicName('');
        setNewTopicCategory('healthcare' as TopicCategory);
      } catch (addError) {
        console.error('Failed to add topic:', addError);
      } finally {
        setIsAddingTopic(false);
      }
    };

    const handleRemoveTopic = async (topicId: string) => {
      try {
        await actions.removeTopic(topicId);
      } catch (removeError) {
        console.error('Failed to remove topic:', removeError);
      }
    };

    const handleRefresh = async () => {
      try {
        await actions.refresh();
      } catch (refreshError) {
        console.error('Failed to refresh topics:', refreshError);
      }
    };

    const handleRecovery = async () => {
      try {
        await recovery.recover();
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    };

    // Fixed: relaxed type to string to prevent mismatch with TopicCategory enum
    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'legislative':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'community':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'policy':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'advocacy':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    // Error state with recovery options
    if (error && !loading) {
      return (
        <Card className={`bg-white rounded-lg border border-red-200 shadow ${className}`}>
          <CardHeader className="px-5 py-4 border-b border-red-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-red-800">Tracked Topics</h3>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-3">{error.message}</p>
              {recovery.canRecover && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecovery}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Recovery
                  </Button>
                  <div className="text-xs text-red-500">
                    {recovery.suggestions.map((suggestion, index) => (
                      <p key={index}>{suggestion}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`bg-white rounded-lg border border-slate-200 shadow ${className}`}>
        <CardHeader className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Tracked Topics</h3>
            <div className="flex items-center space-x-2">
              {data.lastRefresh && (
                <span className="text-xs text-slate-500">
                  Updated {data.lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-medium px-2.5 py-1.5"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-3 w-3 mr-1" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          {(isEditing || filteredTopics.length > 5) && (
            <div className="flex items-center space-x-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                <Input
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 text-xs h-7"
                />
              </div>

              <select
                aria-label="Filter topics by category"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as TopicCategory | 'all')}
                className="text-xs border border-slate-300 rounded px-2 py-1 h-7"
              >
                <option value="all">All Categories</option>
                <option value="legislative">Legislative</option>
                <option value="community">Community</option>
                <option value="policy">Policy</option>
                <option value="advocacy">Advocacy</option>
              </select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="h-12 bg-slate-100 animate-pulse rounded-md"></div>
          ) : (
            <div className="space-y-3">
              {/* Add New Topic Form */}
              {isEditing && (
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Input
                      placeholder="Enter topic name..."
                      value={newTopicName}
                      onChange={e => setNewTopicName(e.target.value)}
                      className="flex-1 text-xs h-7"
                      onKeyPress={e => e.key === 'Enter' && handleAddTopic()}
                    />
                    <select
                      aria-label="Select category for new topic"
                      value={newTopicCategory}
                      onChange={e => setNewTopicCategory(e.target.value as TopicCategory)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 h-7"
                    >
                      <option value="legislative">Legislative</option>
                      <option value="community">Community</option>
                      <option value="policy">Policy</option>
                      <option value="advocacy">Advocacy</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTopic}
                      disabled={!newTopicName.trim() || isAddingTopic}
                      className="h-7 px-2"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Topics Display */}
              <div className="flex flex-wrap gap-2">
                {filteredTopics.map(topic => (
                  <div
                    key={topic.id}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getCategoryColor(topic.category)} ${
                      !topic.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    <span>{topic.name}</span>
                    {topic.billCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white bg-opacity-50 rounded-full text-xs">
                        {topic.billCount}
                      </span>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTopic(topic.id)}
                        className="ml-2 text-current hover:text-red-600 transition-colors"
                        aria-label={`Remove ${topic.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {filteredTopics.length === 0 && (
                  <div className="text-center py-4 text-slate-500 w-full">
                    <p className="text-sm mb-2">
                      {searchQuery || categoryFilter !== 'all'
                        ? 'No topics match your filters'
                        : 'No topics tracked yet'}
                    </p>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="mt-2"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Add Topics
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

TrackedTopics.displayName = 'TrackedTopics';
