import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '../ui/button';
import { BillCard } from './bill-card';
import { Loader2, AlertCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { logger } from '../utils/logger.js';

interface Bill {
  id: number;
  title: string;
  status: string;
  introduced_date: string;
  description: string;
  sponsor: string;
  cosponsors: number;
  views: number;
  analyses: number;
  endorsements: number;
  supportPercentage: number;
}

interface BillListProps {
  bills: Bill[];
  isLoading: boolean;
  error: Error | null;
  title?: string;
}

export const BillList = ({ bills, isLoading, error, title = "Bills" }: BillListProps) => {
  const [filter, setFilter] = useState<'active' | 'upcoming' | 'passed'>('active');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'card' | 'list'>('list');
  const BILLS_PER_PAGE = 5;

  // Memoize filtered bills to prevent unnecessary recalculations on every render
  const filteredBills = useMemo(() => 
    bills.filter(bill => bill.status.toLowerCase() === filter.toLowerCase()),
    [bills, filter]
  );

  // Memoize paginated bills as well since it depends on filteredBills and page
  const paginatedBills = useMemo(() => 
    filteredBills.slice(0, page * BILLS_PER_PAGE),
    [filteredBills, page]
  );

  const hasMore = paginatedBills.length < filteredBills.length;

  // Reset page when filter changes to avoid showing empty results
  const handleFilterChange = (newFilter: 'active' | 'upcoming' | 'passed') => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when changing filters
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

  // Memoize status styles to avoid recreating the object on every render
  const getStatusStyle = useMemo(() => (status: string) => {
    switch(status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'passed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }, []);

  // Helper function to format numbers with proper pluralization
  const formatCount = (count: number, singular: string, plural: string = singular + 's') => {
    return `${count} ${count === 1 ? singular : plural}`;
  };

  // Helper function to get alternative filter for empty state
  const getAlternativeFilter = (currentFilter: string) => {
    switch(currentFilter) {
      case 'active': return 'upcoming';
      case 'upcoming': return 'passed';
      case 'passed': return 'active';
      default: return 'active';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Displaying {formatCount(paginatedBills.length, 'bill')} of {formatCount(filteredBills.length, `${filter} bill`)}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-end">
          {/* Desktop filter buttons with improved accessibility */}
          <div className="hidden md:flex rounded-md shadow-sm" role="group" aria-label="Filter bills by status">
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              className="rounded-l-md rounded-r-none border-r-0"
              onClick={() => handleFilterChange('active')}
              aria-pressed={filter === 'active'}
            >
              Active
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              className="rounded-none border-r-0"
              onClick={() => handleFilterChange('upcoming')}
              aria-pressed={filter === 'upcoming'}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'passed' ? 'default' : 'outline'}
              size="sm"
              className="rounded-r-md rounded-l-none"
              onClick={() => handleFilterChange('passed')}
              aria-pressed={filter === 'passed'}
            >
              Passed
            </Button>
          </div>

          {/* Mobile dropdown filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="sm" aria-label="Filter bills">
                <Filter className="mr-2 h-4 w-4" />
                <span className="capitalize">Filter: {filter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleFilterChange('active')}>
                Active Bills
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('upcoming')}>
                Upcoming Bills
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('passed')}>
                Passed Bills
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
        ) : paginatedBills.length > 0 ? (
          <>
            {view === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedBills.map(bill => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedBills.map(bill => (
                  <Link key={bill.id} href={`/bills/${bill.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <Badge className={`${getStatusStyle(bill.status)} capitalize`}>
                            {bill.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {new Date(bill.introduced_date).toLocaleDateString()}
                          </div>
                        </div>
                        <CardTitle className="text-xl mt-2 text-primary-700 group-hover:text-primary-800 transition-colors">
                          {bill.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {bill.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="text-sm">
                          <span className="font-medium">Sponsor:</span> {bill.sponsor}
                          {bill.cosponsors > 0 && (
                            <span className="ml-1 text-muted-foreground">
                              +{formatCount(bill.cosponsors, 'cosponsor')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 border-t flex justify-between text-sm text-muted-foreground">
                        <div className="flex gap-4">
                          <div className="flex items-center">
                            <span className="mr-1">🔍</span>
                            <span>{formatCount(bill.views, 'view')}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">📊</span>
                            <span>{formatCount(bill.analyses, 'analysis', 'analyses')}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">👍</span>
                            <span>{formatCount(bill.endorsements, 'endorsement')}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span 
                            className={`mr-2 inline-block w-2 h-2 rounded-full ${
                              bill.supportPercentage > 50 ? 'bg-green-500' : 'bg-amber-500'
                            }`}
                            aria-label={`${bill.supportPercentage}% support`}
                          ></span>
                          <span className="font-medium">{bill.supportPercentage}% support</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(prev => prev + 1)}
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
              No {filter} bills found
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleFilterChange(getAlternativeFilter(filter) as any)}
            >
              Show {getAlternativeFilter(filter)} bills instead
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};