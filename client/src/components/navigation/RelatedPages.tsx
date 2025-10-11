import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigation } from '@/contexts/NavigationContext';
import { RelatedPage } from '@/types/navigation';
import { logger } from '../utils/logger.js';

interface RelatedPagesProps {
  className?: string;
  title?: string;
  maxItems?: number;
  showRelevanceScore?: boolean;
  compact?: boolean;
}

const RelatedPages: React.FC<RelatedPagesProps> = ({ 
  className = '',
  title = 'Related Pages',
  maxItems = 5,
  showRelevanceScore = false,
  compact = false
}) => {
  const { relatedPages, navigateTo } = useNavigation();

  if (relatedPages.length === 0) {
    return null;
  }

  const displayPages = relatedPages.slice(0, maxItems);

  const getCategoryColor = (category: RelatedPage['category']) => {
    const colors = {
      legislative: 'bg-blue-100 text-blue-800',
      community: 'bg-green-100 text-green-800',
      user: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      tools: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.tools;
  };

  const getCategoryLabel = (category: RelatedPage['category']) => {
    const labels = {
      legislative: 'Legislative',
      community: 'Community',
      user: 'User',
      admin: 'Admin',
      tools: 'Tools'
    };
    return labels[category] || 'Other';
  };

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>
        <div className="space-y-1">
          {displayPages.map((page, index) => (
            <Button
              key={`${page.path}-${index}`}
              variant="ghost"
              size="sm"
              onClick={() => navigateTo(page.path)}
              className="w-full justify-start h-auto p-2 text-left"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{page.title}</p>
                  <p className="text-xs text-gray-500 truncate">{page.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayPages.map((page, index) => (
          <div
            key={`${page.path}-${index}`}
            className="group cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            onClick={() => navigateTo(page.path)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                    {page.title}
                  </h4>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getCategoryColor(page.category)}`}
                  >
                    {getCategoryLabel(page.category)}
                  </Badge>
                  {showRelevanceScore && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(page.relevanceScore * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {page.description}
                </p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </div>
        ))}
        
        {relatedPages.length > maxItems && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 text-center">
              {relatedPages.length - maxItems} more related pages available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RelatedPages;