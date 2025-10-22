import { useState } from 'react';
import { 
  Search as SearchIcon, 
  Filter, 
  Grid, 
  List 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedSearch from '@/components/search/advanced-search';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { logger } from '@/utils/browser-logger';

interface SearchFilters {
  query: string;
  category: string;
  status: string;
  sponsor: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags: string[];
  sortBy: string;
  sortOrder: string;
}

interface Bill {
  id: number;
  title: string;
  summary: string;
  status: string;
  category: string;
  introducedDate: string;
  sponsor?: string;
  tags?: string[];
}

interface SearchResult {
  bills: Bill[];
  sponsors: any[];
  total: number;
  facets: {
    categories: { name: string; count: number }[];
    statuses: { name: string; count: number }[];
    sponsors: { name: string; count: number }[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const SearchPage: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    status: '',
    sponsor: '',
    tags: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', filters, currentPage],
    queryFn: async (): Promise<SearchResult> => {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.sponsor) params.append('sponsor', filters.sponsor);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: true
  });

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'committee_review': return 'bg-blue-100 text-blue-800';
      case 'floor_vote': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'technology': return 'bg-blue-100 text-blue-800';
      case 'environment': return 'bg-green-100 text-green-800';
      case 'healthcare': return 'bg-red-100 text-red-800';
      case 'economy': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const BillCard: React.FC<{ bill: Bill }> = ({ bill }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">
            <Link to={`/bills/${bill.id}`} className="hover:text-blue-600">
              {bill.title}
            </Link>
          </CardTitle>
          <div className="flex flex-col space-y-1 ml-4">
            <Badge className={getStatusColor(bill.status)}>
              {bill.status.replace('_', ' ')}
            </Badge>
            {bill.category && (
              <Badge variant="outline" className={getCategoryColor(bill.category)}>
                {bill.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {bill.summary}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Introduced: {format(new Date(bill.introducedDate), 'MMM dd, yyyy')}
          </span>
          {bill.sponsor && (
            <span>Sponsor: {bill.sponsor}</span>
          )}
        </div>
        {bill.tags && bill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {bill.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {bill.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{bill.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const BillListItem: React.FC<{ bill: Bill }> = ({ bill }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              <Link to={`/bills/${bill.id}`} className="hover:text-blue-600">
                {bill.title}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {bill.summary}
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>
                Introduced: {format(new Date(bill.introducedDate), 'MMM dd, yyyy')}
              </span>
              {bill.sponsor && <span>Sponsor: {bill.sponsor}</span>}
            </div>
          </div>
          <div className="flex flex-col space-y-2 ml-4">
            <Badge className={getStatusColor(bill.status)}>
              {bill.status.replace('_', ' ')}
            </Badge>
            {bill.category && (
              <Badge variant="outline" className={getCategoryColor(bill.category)}>
                {bill.category}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search Bills</h1>
        <p className="text-muted-foreground">
          Find and explore legislative bills using advanced search filters
        </p>
      </div>

      {/* Search Interface */}
      <div className="mb-6">
        <AdvancedSearch onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Results */}
      {searchResults && (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">
                Search Results ({searchResults.total} found)
              </h2>
              {filters.query && (
                <Badge variant="outline">
                  Query: "{filters.query}"
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Facets Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filter Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Categories */}
                  {searchResults.facets.categories.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Categories</h4>
                      <div className="space-y-1">
                        {searchResults.facets.categories.map(category => (
                          <div key={category.name} className="flex items-center justify-between text-sm">
                            <span>{category.name}</span>
                            <Badge variant="secondary">{category.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statuses */}
                  {searchResults.facets.statuses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Status</h4>
                      <div className="space-y-1">
                        {searchResults.facets.statuses.map(status => (
                          <div key={status.name} className="flex items-center justify-between text-sm">
                            <span>{status.name.replace('_', ' ')}</span>
                            <Badge variant="secondary">{status.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <SearchIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Searching...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">Search failed. Please try again.</p>
                </div>
              ) : searchResults.bills.length === 0 ? (
                <div className="text-center py-8">
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.bills.map(bill => (
                        <BillCard key={bill.id} bill={bill} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.bills.map(bill => (
                        <BillListItem key={bill.id} bill={bill} />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {searchResults.pagination.pages > 1 && (
                    <div className="flex items-center justify-center space-x-2 pt-6">
                      <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {searchResults.pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        disabled={currentPage === searchResults.pagination.pages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;