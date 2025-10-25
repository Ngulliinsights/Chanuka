
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { logger } from '../../utils/browser-logger';

interface BillCardProps {
  bill: {
    id: number;
    title: string;
    status: string;
    introduced_date: string;
    sponsor_count?: number;
    conflict_level?: 'low' | 'medium' | 'high';
    summary?: string;
    category?: string;
  };
}

const statusColors = {
  introduced: 'bg-info text-info-foreground',
  committee: 'bg-warning text-warning-foreground',
  passed: 'bg-success text-success-foreground',
  failed: 'bg-destructive text-destructive-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

const conflictColors = {
  low: 'risk-low',
  medium: 'risk-medium',
  high: 'risk-high',
};

export function BillCard({ bill }: BillCardProps) {
  const statusColor = statusColors[bill.status as keyof typeof statusColors] || statusColors.introduced;
  const conflictColor = bill.conflict_level ? conflictColors[bill.conflict_level] : '';

  return (
    <Card className="card-enhanced card-hover group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            <Link to={`/bills/${bill.id}`} className="hover:underline">
              {bill.title}
            </Link>
          </CardTitle>
          {bill.category && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {bill.category}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {bill.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bill.summary}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Badge className={cn('status-badge', statusColor)}>
            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
          </Badge>
          
          {bill.conflict_level && (
            <Badge className={cn('status-indicator', conflictColor)}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {bill.conflict_level.charAt(0).toUpperCase() + bill.conflict_level.slice(1)} Risk
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(bill.introduced_date).toLocaleDateString()}</span>
            </div>
            
            {bill.sponsor_count && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{bill.sponsor_count} sponsors</span>
              </div>
            )}
          </div>
          
          <Link 
            to={`/bills/${bill.id}`}
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
