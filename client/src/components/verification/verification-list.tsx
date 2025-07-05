import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/spinner';
import { useBills } from '@/hooks/use-bills';

interface VerificationItem {
  id: number;
  billId: number;
  billTitle: string;
  claimType: 'constitutional' | 'economic' | 'legal' | 'scientific';
  claimText: string;
  status: 'pending' | 'verified' | 'disputed';
  dateSubmitted: string;
}

export const VerificationsList = () => {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'verified' | 'disputed'>('all');
  const { bills } = useBills();

  useEffect(() => {
    // This would be replaced with an actual API call in production
    const mockItems: VerificationItem[] = [
      {
        id: 1,
        billId: 1,
        billTitle: "H.R. 1234: Education Reform Act",
        claimType: 'constitutional',
        claimText: "The federal funding provisions are consistent with South Dakota v. Dole precedent",
        status: 'verified',
        dateSubmitted: "2023-04-15T10:30:00Z"
      },
      {
        id: 2,
        billId: 1,
        billTitle: "H.R. 1234: Education Reform Act",
        claimType: 'economic',
        claimText: "Implementation costs will be offset by long-term economic benefits",
        status: 'pending',
        dateSubmitted: "2023-04-16T14:20:00Z"
      },
      {
        id: 3,
        billId: 2,
        billTitle: "S. 789: Healthcare Accessibility Act",
        claimType: 'legal',
        claimText: "New regulations comply with existing HIPAA framework",
        status: 'disputed',
        dateSubmitted: "2023-04-10T09:15:00Z"
      },
      {
        id: 4,
        billId: 3,
        billTitle: "H.R. 567: Climate Action Plan",
        claimType: 'scientific',
        claimText: "Emission targets align with IPCC recommendations",
        status: 'pending',
        dateSubmitted: "2023-04-18T11:45:00Z"
      }
    ];

    setTimeout(() => {
      setItems(mockItems);
      setIsLoading(false);
    }, 800);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
      case 'disputed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Disputed</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'constitutional':
        return 'text-blue-600';
      case 'economic':
        return 'text-green-600';
      case 'legal':
        return 'text-purple-600';
      case 'scientific':
        return 'text-amber-600';
      default:
        return 'text-slate-600';
    }
  };

  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(item => item.status === activeFilter);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 mb-4">
        <Button 
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={activeFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('pending')}
        >
          Pending
        </Button>
        <Button 
          variant={activeFilter === 'verified' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('verified')}
        >
          Verified
        </Button>
        <Button 
          variant={activeFilter === 'disputed' ? 'default' : 'outline'}
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
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.billTitle}
                </TableCell>
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
