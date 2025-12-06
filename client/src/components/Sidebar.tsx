import { Gauge, Milestone, ToggleLeft, BarChart3, GitBranch, Layers, Flag, Split } from "lucide-react";

import { logger } from '@/utils/logger';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-background border-r border-border h-[calc(100vh-73px)] p-4 space-y-2">
      <nav className="space-y-1">
        <button 
          onClick={() => {
            const section = document.getElementById('overview');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-accent text-accent-foreground font-medium w-full text-left"
        >
          <Gauge className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button 
          onClick={() => {
            const section = document.getElementById('checkpoints');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors w-full text-left"
        >
          <Milestone className="w-4 h-4" />
          <span>Checkpoints</span>
        </button>
        <button 
          onClick={() => {
            const section = document.getElementById('features');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors w-full text-left"
        >
          <ToggleLeft className="w-4 h-4" />
          <span>Feature Flags</span>
        </button>
        <button 
          onClick={() => {
            const section = document.getElementById('analytics');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors w-full text-left"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
        <button 
          onClick={() => {
            const section = document.getElementById('decisions');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors w-full text-left"
        >
          <GitBranch className="w-4 h-4" />
          <span>Decision Points</span>
        </button>
        <button 
          onClick={() => {
            const section = document.getElementById('architecture');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors w-full text-left"
        >
          <Layers className="w-4 h-4" />
          <span>Architecture</span>
        </button>
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

