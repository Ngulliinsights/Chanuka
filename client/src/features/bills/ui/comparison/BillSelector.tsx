/**
 * Bill Selector Component
 *
 * Allows users to select multiple bills for comparison.
 * Supports search, filtering, and recent bills.
 */

import { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { billsApiService } from '../../services/api';
import { Button, Input, Card, CardContent } from '@client/lib/design-system';

interface BillSelectorProps {
  selectedBillIds: string[];
  onBillsSelected: (billIds: string[]) => void;
  maxBills?: number;
}

export function BillSelector({
  selectedBillIds,
  onBillsSelected,
  maxBills = 4,
}: BillSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch bills for search
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['bills', 'search', searchQuery],
    queryFn: () =>
      billsApiService.getBills({
        query: searchQuery,
        limit: 10,
      }),
    enabled: searchQuery.length > 2,
  });

  // Fetch selected bills details
  const { data: selectedBills } = useQuery({
    queryKey: ['bills', 'selected', selectedBillIds],
    queryFn: async () => {
      const bills = await Promise.all(selectedBillIds.map(id => billsApiService.getBillById(id)));
      return bills;
    },
    enabled: selectedBillIds.length > 0,
  });

  const handleAddBill = (billId: string) => {
    if (selectedBillIds.length >= maxBills) {
      return;
    }
    if (!selectedBillIds.includes(billId)) {
      onBillsSelected([...selectedBillIds, billId]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleRemoveBill = (billId: string) => {
    onBillsSelected(selectedBillIds.filter(id => id !== billId));
  };

  const canAddMore = selectedBillIds.length < maxBills;

  // Get bills array from paginated response
  const billsList = (searchResults as any)?.bills || [];

  return (
    <div className="space-y-4">
      {/* Selected Bills */}
      {selectedBills && selectedBills.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Selected Bills ({selectedBills.length}/{maxBills})
          </h3>
          <div className="grid gap-2">
            {selectedBills.map((bill: any) => (
              <Card key={bill.id} className="relative">
                <CardContent className="p-3">
                  <button
                    onClick={() => handleRemoveBill(bill.id)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Remove bill"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="pr-8">
                    <div className="text-sm font-medium">{bill.bill_number}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {bill.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {bill.status}
                      </span>
                      <span className="text-xs text-gray-500">{bill.chamber}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Bill Button/Search */}
      {canAddMore && (
        <div>
          {!isSearching ? (
            <Button onClick={() => setIsSearching(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Bill to Compare
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search bills by title, number, or keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results */}
              {searchQuery.length > 2 && (
                <Card>
                  <CardContent className="p-2 max-h-64 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-4 text-sm text-gray-500">Searching...</div>
                    ) : billsList && billsList.length > 0 ? (
                      <div className="space-y-1">
                        {billsList
                          .filter((bill: any) => !selectedBillIds.includes(bill.id))
                          .map((bill: any) => (
                            <button
                              key={bill.id}
                              onClick={() => handleAddBill(bill.id)}
                              className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="text-sm font-medium">{bill.bill_number}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                {bill.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                  {bill.status}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-gray-500">No bills found</div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {selectedBillIds.length < 2 && (
        <p className="text-xs text-gray-500 text-center">Select at least 2 bills to compare</p>
      )}
    </div>
  );
}
