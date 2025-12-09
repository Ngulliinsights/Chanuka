import { 
  FileText, 
  AlertTriangle, 
  Shield,
  TrendingUp, 
  Clock,
} from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '@client/shared/design-system/primitives/card';

// Stats data structure that the component expects
interface BillsStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}

interface StatsOverviewProps {
  stats: BillsStats;
  className?: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, className }) => {
  // Define the four key metrics we want to display in cards
  const statItems = [
    {
      label: 'Total Bills',
      value: stats.totalBills.toLocaleString(), // Format numbers with commas for readability
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Urgent Bills',
      value: stats.urgentCount.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Constitutional Issues',
      value: stats.constitutionalFlags.toLocaleString(),
      icon: Shield, // Now properly imported from lucide-react
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Trending',
      value: stats.trendingCount.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  // Helper function to format the timestamp into a human-readable relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className={className}>
      {/* Grid layout that adapts from 2 columns on mobile to 4 columns on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  {/* Colored icon circle that visually categorizes each stat */}
                  <div className={`p-2 rounded-lg ${item.bgColor} mr-3`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-sm text-gray-600">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Footer section showing when data was last refreshed */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>Last updated: {formatRelativeTime(stats.lastUpdated)}</span>
        </div>
        <div>
          Data refreshes every 5 minutes
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;