import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { Input } from '@client/lib/design-system';
import { Label } from '@client/lib/design-system';
import { Textarea } from '@client/lib/design-system';
import { Switch } from '@client/lib/design-system';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/lib/design-system';
import { workspaceService } from '@client/features/community/collaboration/services/workspace-service';
import { WorkspaceCard } from '@client/features/community/collaboration/ui/WorkspaceCard';
import { useToast } from '@client/lib/hooks/use-toast';

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState(workspaceService.getWorkspaces());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  const handleCreate = () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a workspace name',
        variant: 'destructive',
      });
      return;
    }

    workspaceService.createWorkspace({
      name: name.trim(),
      description: description.trim() || undefined,
      collectionIds: [],
      settings: {
        isPublic,
        allowComments: true,
        allowInvites: true,
      },
    });

    setWorkspaces(workspaceService.getWorkspaces());
    setOpen(false);
    setName('');
    setDescription('');
    setIsPublic(false);

    toast({
      title: 'Workspace created',
      description: `"${name}" has been created`,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this workspace?')) {
      workspaceService.deleteWorkspace(id);
      setWorkspaces(workspaceService.getWorkspaces());
      toast({
        title: 'Workspace deleted',
        description: 'Workspace removed successfully',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-gray-600 mt-2">Collaborate with your team on bills and campaigns</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Workspace"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace for?"
                  rows={3}
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
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No workspaces yet</p>
          <p className="text-sm text-gray-500 mt-1">Create a workspace to start collaborating</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
