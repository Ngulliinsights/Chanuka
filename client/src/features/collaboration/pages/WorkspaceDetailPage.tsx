import React from 'react';
import { useParams } from 'react-router-dom';
import { Users, Settings } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { workspaceService } from '@client/features/collaboration/services/workspace-service';
import { ActivityFeed } from '@client/features/collaboration/ui/ActivityFeed';

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const workspace = id ? workspaceService.getWorkspace(id) : null;

  if (!workspace) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-gray-600 mt-2">{workspace.description}</p>
          )}
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members ({workspace.members.length})
          </TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <ActivityFeed workspaceId={workspace.id} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="space-y-4">
            {workspace.members.length === 0 ? (
              <p className="text-gray-600 text-center py-12">No members yet</p>
            ) : (
              workspace.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <span className="text-sm text-gray-600 capitalize">{member.role}</span>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          <p className="text-gray-600 text-center py-12">No collections yet</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
