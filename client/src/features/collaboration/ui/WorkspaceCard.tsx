import React from 'react';
import { Users, Settings, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/lib/design-system';
import { Workspace } from '@client/features/collaboration/services/workspace-service';
import { useNavigate } from 'react-router-dom';

interface WorkspaceCardProps {
  workspace: Workspace;
  onDelete: (id: string) => void;
}

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={() => navigate(`/workspaces/${workspace.id}`)}>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {workspace.name}
            </CardTitle>
            {workspace.description && (
              <p className="text-sm text-gray-600 mt-1">{workspace.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/workspaces/${workspace.id}/settings`)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(workspace.id)}
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
            {workspace.members.length} {workspace.members.length === 1 ? 'member' : 'members'}
          </span>
          <div className="flex gap-1">
            {workspace.settings.isPublic && <Badge variant="secondary">Public</Badge>}
            {workspace.settings.allowComments && <Badge variant="outline">Comments</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
