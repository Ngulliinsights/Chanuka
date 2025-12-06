import { 
  FileText, 
  AlertTriangle, 
  Flag, 
  TrendingUp, 
  Clock,
  Users,
  Activity
} from 'lucide-react';
import React from 'react';

import { Badge } from '@client/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { cn } from '@client/lib/utils';
// Define BillsStats locally as per migration instructions
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

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'urgent' | 'constitutional' | 'trending';
  className?: string;
}

const colorClasses = {
  primary: {
    icon: 'text-[hsl(var(--primary))]',
    bg: 'bg-[hsl(var(--primary))]/10',
    border: 'border-[hsl(var(--primary))]/20',
  },
  urgent: {
    icon: 'text-[hsl(var(--civic-urgent))]',
    bg: 'bg-[hsl(var(--civic-urgent))]/10',
    border: 'border-[hsl(var(--civic-urgent))]/20',
  },
  constitutional: {
    icon: 'text-[hsl(var(--civic-constitutional))]',
    bg: 'bg-[hsl(var(--civic-constitutional))]/10',
    border: 'border-[hsl(var(--civic-constitutional))]/20',
  },
  trending: {
    icon: 'text-[hsl(var(--civic-community))]',
    bg: 'bg-[hsl(var(--civic-community))]/10',
    border: 'border-[hsl(var(--civic-community))]/20',
  },
};

function StatCard({ title, value, icon, description, trend, color, className }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <Card className={cn("chanuka-card transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    trend.isPositive ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            colors.bg,
            colors.border,
            "border"
          )}>
            <div className={colors.icon}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsOverview({ stats, className }: StatsOverviewProps) {
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Legislative Overview</h2>
          <p className="text-muted-foreground">
            Real-time statistics and trends
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Updated {formatLastUpdated(stats.lastUpdated)}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bills"
          value={stats.totalBills.toLocaleString()}
          icon={<FileText className="h-6 w-6" />}
          description="Active legislation"
          color="primary"
        />
        
        <StatCard
          title="Urgent Bills"
          value={stats.urgentCount}
          icon={<AlertTriangle className="h-6 w-6" />}
          description="High & critical priority"
          color="urgent"
          trend={{
            value: 12,
            isPositive: false
          }}
        />
        
        <StatCard
          title="Constitutional Issues"
          value={stats.constitutionalFlags}
          icon={<Flag className="h-6 w-6" />}
          description="Bills with constitutional concerns"
          color="constitutional"
        />
        
        <StatCard
          title="Trending"
          value={stats.trendingCount}
          icon={<TrendingUp className="h-6 w-6" />}
          description="High engagement bills"
          color="trending"
          trend={{
            value: 8,
            isPositive: true
          }}
        />
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="chanuka-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bills introduced today</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status changes</span>
                <span className="font-medium">7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New comments</span>
                <span className="font-medium">24</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Community Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active users</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expert contributions</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bills saved</span>
                <span className="font-medium">156</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Healthcare</span>
                <Badge variant="secondary" className="text-xs">23</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Education</span>
                <Badge variant="secondary" className="text-xs">18</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="secondary" className="text-xs">15</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}