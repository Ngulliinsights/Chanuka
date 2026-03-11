import { logger } from '@client/lib/utils/logger';

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  members: WorkspaceMember[];
  collectionIds: string[];
  createdAt: string;
  updatedAt: string;
  settings: {
    isPublic: boolean;
    allowComments: boolean;
    allowInvites: boolean;
  };
}

class WorkspaceService {
  private readonly STORAGE_KEY = 'chanuka_workspaces';

  getWorkspaces(): Workspace[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to load workspaces', { component: 'WorkspaceService' }, error);
      return [];
    }
  }

  getWorkspace(id: string): Workspace | null {
    return this.getWorkspaces().find(w => w.id === id) || null;
  }

  createWorkspace(data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt' | 'members'>): Workspace {
    const workspace: Workspace = {
      ...data,
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      members: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const workspaces = this.getWorkspaces();
    workspaces.push(workspace);
    this.saveWorkspaces(workspaces);

    logger.info('Workspace created', { component: 'WorkspaceService', workspaceId: workspace.id });
    return workspace;
  }

  updateWorkspace(id: string, updates: Partial<Workspace>): Workspace | null {
    const workspaces = this.getWorkspaces();
    const index = workspaces.findIndex(w => w.id === id);

    if (index === -1) return null;

    workspaces[index] = {
      ...workspaces[index],
      ...updates,
      id: workspaces[index].id,
      createdAt: workspaces[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.saveWorkspaces(workspaces);
    return workspaces[index];
  }

  deleteWorkspace(id: string): boolean {
    const workspaces = this.getWorkspaces();
    const filtered = workspaces.filter(w => w.id !== id);

    if (filtered.length === workspaces.length) return false;

    this.saveWorkspaces(filtered);
    logger.info('Workspace deleted', { component: 'WorkspaceService', workspaceId: id });
    return true;
  }

  addMember(workspaceId: string, member: WorkspaceMember): boolean {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return false;

    if (workspace.members.some(m => m.userId === member.userId)) return false;

    workspace.members.push(member);
    this.updateWorkspace(workspaceId, { members: workspace.members });
    return true;
  }

  removeMember(workspaceId: string, userId: string): boolean {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return false;

    workspace.members = workspace.members.filter(m => m.userId !== userId);
    this.updateWorkspace(workspaceId, { members: workspace.members });
    return true;
  }

  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceMember['role']): boolean {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return false;

    const member = workspace.members.find(m => m.userId === userId);
    if (!member) return false;

    member.role = role;
    this.updateWorkspace(workspaceId, { members: workspace.members });
    return true;
  }

  private saveWorkspaces(workspaces: Workspace[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workspaces));
    } catch (error) {
      logger.error('Failed to save workspaces', { component: 'WorkspaceService' }, error);
    }
  }
}

export const workspaceService = new WorkspaceService();
