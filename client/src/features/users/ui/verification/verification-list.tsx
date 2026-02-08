import { useState, useEffect } from 'react';
import React from 'react';

import { useBills } from '@client/features/bills';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { LoadingSpinner } from '@client/lib/design-system';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

interface VerificationItem {
  id: number;
  bill_id: number;
  billTitle: string;
  claimType: 'constitutional' | 'economic' | 'legal' | 'scientific';
  claimText: string;
  status: 'pending' | 'verified' | 'disputed';
  dateSubmitted: string;
}

export const VerificationsList = () => {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'verified' | 'disputed'>(
    'all'
  );
  const { data: bills } = useBills();

  useEffect(() => {
    // This would be replaced with an actual API call in production
    const mockItems: VerificationItem[] = [
      {
        id: 1,
        bill_id: 1,
        billTitle: 'N.A.B. 1234: Education Reform Act',
        claimType: 'constitutional',
        claimText:
          'The national funding provisions are consistent with Council of Governors v. National Government precedent',
        status: 'verified',
        dateSubmitted: '2023-04-15T10:30:00Z',
      },
      {
        id: 2,
        bill_id: 1,
        billTitle: 'N.A.B. 1234: Education Reform Act',
        claimType: 'economic',
        claimText: 'Implementation costs will be offset by long-term economic benefits',
        status: 'pending',
        dateSubmitted: '2023-04-16T14:20:00Z',
      },
      {
        id: 3,
        bill_id: 2,
        billTitle: 'Sen. Bill 789: Healthcare Accessibility Act',
        claimType: 'legal',
        claimText: 'New regulations comply with existing Data Protection Act framework',
        status: 'disputed',
        dateSubmitted: '2023-04-10T09:15:00Z',
      },
      {
        id: 4,
        bill_id: 3,
        billTitle: 'H.R. 567: Climate Action Plan',
        claimType: 'scientific',
        claimText: 'Emission targets align with IPCC recommendations',
        status: 'pending',
        dateSubmitted: '2023-04-18T11:45:00Z',
      },
    ];

    setTimeout(() => {
      setItems(mockItems);
      setIsLoading(false);
    }, 800);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="bg-success text-success-foreground hover:bg-success">
            Verified
          </Badge>
        );
      case 'disputed':
        return (
          <Badge
            variant="outline"
            className="bg-destructive text-destructive-foreground hover:bg-destructive"
          >
            Disputed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-warning text-warning-foreground hover:bg-warning">
            Pending
          </Badge>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'constitutional':
        return 'text-info';
      case 'economic':
        return 'text-success';
      case 'legal':
        return 'text-accent';
      case 'scientific':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const filteredItems =
    activeFilter === 'all' ? items : items.filter(item => item.status === activeFilter);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 mb-4">
        <Button
          variant={activeFilter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
        >
          All
        </Button>
        <Button
          variant={activeFilter === 'pending' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('pending')}
        >
          Pending
        </Button>
        <Button
          variant={activeFilter === 'verified' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('verified')}
        >
          Verified
        </Button>
        <Button
          variant={activeFilter === 'disputed' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('disputed')}
        >
          Disputed
        </Button>
      </div>

      {filteredItems.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.billTitle}</TableCell>
                <TableCell className="max-w-xs truncate">{item.claimText}</TableCell>
                <TableCell className={getTypeColor(item.claimType)}>
                  {item.claimType.charAt(0).toUpperCase() + item.claimType.slice(1)}
                </TableCell>
                <TableCell>{new Date(item.dateSubmitted).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={item.status !== 'pending'}
                    onClick={() => {
                      // Navigate to review page
                      window.location.href = `/verification/review/${item.id}`;
                    }}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg border">
          <p className="text-slate-500">No items matching your filter.</p>
        </div>
      )}
    </div>
  );
};
