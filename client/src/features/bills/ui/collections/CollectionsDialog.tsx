import React, { useState } from 'react';
import { Plus, FolderPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Input } from '@client/lib/design-system';
import { Label } from '@client/lib/design-system';
import { Textarea } from '@client/lib/design-system';
import { Switch } from '@client/lib/design-system';
import { collectionsService, BillCollection } from '@client/features/bills/services/collections-service';
import { useToast } from '@client/lib/hooks/use-toast';

interface CollectionsDialogProps {
  billId?: string;
  onCollectionCreated?: (collection: BillCollection) => void;
}

export function CollectionsDialog({ billId, onCollectionCreated }: CollectionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const { toast } = useToast();

  const handleCreate = () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a collection name',
        variant: 'destructive',
      });
      return;
    }

    const collection = collectionsService.createCollection({
      name: name.trim(),
      description: description.trim() || undefined,
      billIds: billId ? [billId] : [],
      isPublic,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    toast({
      title: 'Collection created',
      description: `"${collection.name}" has been created`,
    });

    onCollectionCreated?.(collection);
    setOpen(false);
    setName('');
    setDescription('');
    setIsPublic(false);
    setTags('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Bills Collection"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this collection about?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="education, health, finance"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="public">Make public</Label>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
