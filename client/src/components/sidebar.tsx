import { Gauge, Milestone, ToggleLeft, BarChart3, GitBranch, Layers, Flag, Split } from "lucide-react";
import { logger } from '../utils/browser-logger';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-background border-r border-border h-[calc(100vh-73px)] p-4 space-y-2">
      <nav className="space-y-1">
        <a href="#overview" className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-accent text-accent-foreground font-medium">
          <Gauge className="w-4 h-4" />
          <span>Overview</span>
        </a>
        <a href="#checkpoints" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors">
          <Milestone className="w-4 h-4" />
          <span>Checkpoints</span>
        </a>
        <a href="#features" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors">
          <ToggleLeft className="w-4 h-4" />
          <span>Feature Flags</span>
        </a>
        <a href="#analytics" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors">
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </a>
        <a href="#decisions" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors">
          <GitBranch className="w-4 h-4" />
          <span>Decision Points</span>
        </a>
        <a href="#architecture" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors">
          <Layers className="w-4 h-4" />
          <span>Architecture</span>
        </a>
      </nav>
      
      <hr className="border-border my-4" />
      
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h3>
        <button className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary-dark transition-colors">
          <Flag className="w-4 h-4" />
          <span>Create Checkpoint</span>
        </button>
        <button className="w-full flex items-center justify-center space-x-2 bg-warning text-warning-foreground px-3 py-2 rounded-lg hover:bg-warning-dark transition-colors">
          <Split className="w-4 h-4" />
          <span>Plan Pivot</span>
        </button>
      </div>
    </aside>
  );
}

