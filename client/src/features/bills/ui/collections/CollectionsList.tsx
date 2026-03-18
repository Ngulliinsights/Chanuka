import React, { useState } from 'react';
import { Folder, Share2, Download, Trash2, Edit, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/lib/design-system';
import {
  collectionsService,
  BillCollection,
} from '@client/features/bills/services/collections-service';
import { useToast } from '@client/lib/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function CollectionsList() {
  const [collections, setCollections] = useState<BillCollection[]>(
    collectionsService.getCollections()
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleShare = (collection: BillCollection) => {
    const token = collectionsService.generateShareToken(collection.id);
    const url = `${window.location.origin}/collections/shared/${token}`;

    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard',
    });
  };

  const handleExport = (collection: BillCollection) => {
    const json = collectionsService.exportCollection(collection.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Collection exported successfully',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this collection?')) {
      collectionsService.deleteCollection(id);
      setCollections(collectionsService.getCollections());
      toast({
        title: 'Deleted',
        description: 'Collection deleted successfully',
      });
    }
  };

  const handleView = (id: string) => {
    navigate(`/bills?collection=${id}`);
  };

  if (collections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No collections yet</p>
          <p className="text-sm text-gray-500 mt-1">Create a collection to organize your bills</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map(collection => (
        <Card key={collection.id} className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1" onClick={() => handleView(collection.id)}>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  {collection.name}
                </CardTitle>
                {collection.description && (
                  <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleView(collection.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare(collection)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport(collection)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(collection.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {collection.billIds.length} {collection.billIds.length === 1 ? 'bill' : 'bills'}
              </span>
              <div className="flex gap-1">
                {collection.isPublic && <Badge variant="secondary">Public</Badge>}
                {collection.tags?.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
