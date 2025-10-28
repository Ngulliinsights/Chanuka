import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { BillCard } from './BillCard';
import { Loader2, AlertCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import type { Bill, BillsQueryParams } from '../types';

interface BillListProps {
  bills: Bill[];
  isLoading: boolean;
  error: Error | null;
  title?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  filters?: BillsQueryParams;
  onFiltersChange?: (filters: BillsQueryParams) => void;
}

export const BillList = ({
  bills,
  isLoading,
  error,
  title = "Bills",
  onLoadMore,
  hasMore = false,
  filters = {},
  onFiltersChange
}: BillListProps) => {
  const [view, setView] = useState<'card' | 'list'>('list');

  // Memoize status styles to avoid recreating the object on every render
  const getStatusStyle = useMemo(() => (status: string) => {
    switch(status.toLowerCase()) {
      case 'introduced':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'committee':
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'passed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }, []);

  // Helper function to format numbers with proper pluralization
  const formatCount = (count: number, singular: string, plural: string = singular + 's') => {
    return `${count} ${count === 1 ? singular : plural}`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <h3 className="font-semibold">Error Loading Bills</h3>
        </div>
        <p className="text-sm pl-7">{error.message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 ml-7 border-red-300 text-red-700 hover:bg-red-100"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Displaying {formatCount(bills.length, 'bill')}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-end">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Filter bills">
                <Filter className="mr-2 h-4 w-4" />
                <span>Filters</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onFiltersChange?.({ ...filters, status: 'introduced' })}>
                Introduced Bills
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFiltersChange?.({ ...filters, status: 'committee' })}>
                In Committee
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFiltersChange?.({ ...filters, status: 'passed' })}>
                Passed Bills
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFiltersChange?.({})}>
                Clear Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p>Loading bills...</p>
          </div>
        ) : bills.length > 0 ? (
          <>
            {view === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bills.map(bill => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {bills.map(bill => (
                  <Link key={bill.id} to={`/bills/${bill.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <Badge className={`${getStatusStyle(bill.status)} capitalize`}>
                            {bill.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {new Date(bill.introducedDate).toLocaleDateString()}
                          </div>
                        </div>
                        <CardTitle className="text-xl mt-2 text-primary-700 group-hover:text-primary-800 transition-colors">
                          {bill.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {bill.summary}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="text-sm">
                          {bill.sponsors && bill.sponsors.length > 0 && (
                            <>
                              <span className="font-medium">Sponsor:</span> {bill.sponsors[0].name}
                              {bill.sponsors.length > 1 && (
                                <span className="ml-1 text-muted-foreground">
                                  +{formatCount(bill.sponsors.length - 1, 'cosponsor')}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 border-t flex justify-between text-sm text-muted-foreground">
                        <div className="flex gap-4">
                          {bill.engagementMetrics && (
                            <>
                              <div className="flex items-center">
                                <span className="mr-1">🔍</span>
                                <span>{formatCount(bill.engagementMetrics.views, 'view')}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="mr-1">💬</span>
                                <span>{formatCount(bill.comments?.length || 0, 'comment')}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {bill.trackingCount && (
                          <div className="flex items-center">
                            <span className="mr-1">👁️</span>
                            <span>{formatCount(bill.trackingCount, 'tracking')}</span>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {hasMore && onLoadMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  className="min-w-[150px]"
                >
                  Load More Bills
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-gray-500 mb-2">
              No bills found
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltersChange?.({})}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

