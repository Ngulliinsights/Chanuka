/**
 * Sentiment Heatmap Component
 * 
 * Visualizes sentiment distribution across arguments.
 */

import type { SentimentData } from '../types';

interface SentimentHeatmapProps {
  sentimentData: SentimentData;
  className?: string;
}

export function SentimentHeatmap({ sentimentData, className = '' }: SentimentHeatmapProps) {
  const getSentimentColor = (sentiment: number) => {
    // Sentiment ranges from -1 (negative) to 1 (positive)
    if (sentiment > 0.5) return 'bg-green-500';
    if (sentiment > 0.2) return 'bg-green-300';
    if (sentiment > -0.2) return 'bg-yellow-300';
    if (sentiment > -0.5) return 'bg-orange-300';
    return 'bg-red-500';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.5) return 'Very Positive';
    if (sentiment > 0.2) return 'Positive';
    if (sentiment > -0.2) return 'Neutral';
    if (sentiment > -0.5) return 'Negative';
    return 'Very Negative';
  };

  const totalCount = sentimentData.distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>

      {/* Overall Sentiment */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Sentiment</span>
          <span className="text-sm font-semibold">
            {getSentimentLabel(sentimentData.overall)}
          </span>
        </div>
        <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden relative">
          <div
            className={`h-full ${getSentimentColor(sentimentData.overall)} transition-all`}
            style={{ width: `${((sentimentData.overall + 1) / 2) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700">
              {sentimentData.overall.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Position-based Sentiment */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">By Position</h4>
        
        {sentimentData.distribution.map((item) => {
          const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
          
          return (
            <div key={item.position} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{item.position}</span>
                <span className="text-gray-600">
                  {item.count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              
              <div className="flex gap-2">
                {/* Count bar */}
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      item.position === 'support'
                        ? 'bg-green-200'
                        : item.position === 'oppose'
                        ? 'bg-red-200'
                        : 'bg-gray-300'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                {/* Sentiment indicator */}
                <div className="w-20 h-6 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className={`h-full ${getSentimentColor(item.averageSentiment)}`}
                    style={{ width: `${((item.averageSentiment + 1) / 2) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {item.averageSentiment.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-medium text-gray-600 mb-2">Sentiment Scale</p>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>Very Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-300 rounded" />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-300 rounded" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-300 rounded" />
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Very Positive</span>
          </div>
        </div>
      </div>
    </div>
  );
}
