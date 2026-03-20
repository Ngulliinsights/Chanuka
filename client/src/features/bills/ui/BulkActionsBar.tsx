import { Download, Plus, Tag, X } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { collectionsService } from '@client/features/bills/services/collections-service';
import { useToast } from '@client/lib/hooks/use-toast';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedBillIds: string[];
  onClearSelection: () => void;
  onExport: () => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedBillIds,
  onClearSelection,
  onExport,
}: BulkActionsBarProps) {
  const { toast } = useToast();

  const handleAddToCollection = () => {
    const collections = collectionsService.getCollections();
    
    if (collections.length === 0) {
      toast({
        title: 'No collections',
        description: 'Create a collection first',
        variant: 'destructive',
      });
      return;
    }

    // For simplicity, add to first collection
    // In real app, show collection picker dialog
    const collection = collections[0];
    if (!collection) return;
    
    selectedBillIds.forEach(billId => {
      collectionsService.addBillToCollection(collection.id, billId);
    });

    toast({
      title: 'Added to collection',
      description: `${selectedCount} bills added to "${collection.name}"`,
    });
    onClearSelection();
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="default">{selectedCount} selected</Badge>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-6 w-px bg-gray-300" />
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddToCollection}>
            <Plus className="h-4 w-4 mr-2" />
            Add to Collection
          </Button>
          
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm">
            <Tag className="h-4 w-4 mr-2" />
            Tag
          </Button>
        </div>
      </div>
    </div>
  );
}
