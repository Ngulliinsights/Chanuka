import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Calendar, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Bill } from '../types';

interface BillCardProps {
  bill: Bill;
}

const statusColors = {
  introduced: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  committee: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const conflictColors = {
  low: 'risk-low',
  medium: 'risk-medium',
  high: 'risk-high',
};

export function BillCard({ bill }: BillCardProps) {
  const statusColor = statusColors[bills.status as keyof typeof statusColors] || statusColors.introduced;
  const hasConflicts = bills.sponsors?.some(sponsor => sponsors.conflictOfInterest && sponsors.conflictOfInterest.length > 0);
  const conflict_level = hasConflicts ? 'high' : 'low';

  return (
    <Card className="card-enhanced card-hover group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            <Link to={`/bills/${bills.id}`} className="hover:underline">
              {bills.title}
            </Link>
          </CardTitle>
          {bills.category && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {bills.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {bills.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bills.summary}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge className={cn('status-badge', statusColor)}>
            {bills.status.charAt(0).toUpperCase() + bills.status.slice(1)}
          </Badge>

          {hasConflicts && (
            <Badge className={cn('status-indicator', conflictColors[conflict_level as keyof typeof conflictColors])}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {conflict_level.charAt(0).toUpperCase() + conflict_level.slice(1)} Risk
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(bills.introduced_date).toLocaleDateString()}</span>
            </div>

            {bills.sponsors && bills.sponsors.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{bills.sponsors.length} sponsors</span>
              </div>
            )}
          </div>

          <Link
            to={`/bills/${bills.id}`}
            className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            View Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

