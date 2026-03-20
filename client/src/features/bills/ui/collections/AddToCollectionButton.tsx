import React, { useState } from 'react';
import { FolderPlus, Check } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/lib/design-system';
import { collectionsService } from '@client/features/bills/services/collections-service';
import { CollectionsDialog } from './CollectionsDialog';
import { useToast } from '@client/lib/hooks/use-toast';

interface AddToCollectionButtonProps {
  billId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function AddToCollectionButton({ billId, variant = 'outline', size = 'sm' }: AddToCollectionButtonProps) {
  const [collections, setCollections] = useState(collectionsService.getCollections());
  const { toast } = useToast();

  const handleAddToCollection = (collectionId: string) => {
    const success = collectionsService.addBillToCollection(collectionId, billId);
    if (success) {
      setCollections(collectionsService.getCollections());
      toast({
        title: 'Added to collection',
        description: 'Bill added successfully',
      });
    }
  };

  const handleRemoveFromCollection = (collectionId: string) => {
    collectionsService.removeBillFromCollection(collectionId, billId);
    setCollections(collectionsService.getCollections());
    toast({
      title: 'Removed from collection',
      description: 'Bill removed successfully',
    });
  };

  const isInCollection = (collectionId: string) => {
    const collection = collectionsService.getCollection(collectionId);
    return collection?.billIds.includes(billId) || false;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Add to Collection
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {collections.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-500 text-center">
            No collections yet
          </div>
        ) : (
          collections.map((collection) => {
            const inCollection = isInCollection(collection.id);
            return (
              <DropdownMenuItem
                key={collection.id}
                onClick={() => {
                  if (inCollection) {
                    handleRemoveFromCollection(collection.id);
                  } else {
                    handleAddToCollection(collection.id);
                  }
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{collection.name}</span>
                  {inCollection && <Check className="h-4 w-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <div className="p-2">
          <CollectionsDialog
            billId={billId}
            onCollectionCreated={() => setCollections(collectionsService.getCollections())}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
