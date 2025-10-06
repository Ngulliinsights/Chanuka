import React from 'react';
import { useUnifiedNavigation } from '@/hooks/use-unified-navigation';
import { Button } from '@/components/ui/button';
import { NavigationStatePersistence } from '@/utils/navigation/state-persistence';

/**
 * Debug component to help troubleshoot sidebar issues
 * Only shows in development mode
 */
export const SidebarDebugger: React.FC = () => {
  const { 
    isMobile, 
    sidebarCollapsed, 
    mounted, 
    toggleSidebar, 
    setSidebarCollapsed 
  } = useUnifiedNavigation();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleClearSidebarState = () => {
    NavigationStatePersistence.clearSidebarState();
    // Force reload to see default state
    window.location.reload();
  };

  const handleForceOpen = () => {
    setSidebarCollapsed(false);
  };

  const handleForceClose = () => {
    setSidebarCollapsed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Sidebar Debug</div>
      <div className="space-y-1 mb-3">
        <div>Mounted: {mounted ? 'Yes' : 'No'}</div>
        <div>Mobile: {isMobile ? 'Yes' : 'No'}</div>
        <div>Collapsed: {sidebarCollapsed ? 'Yes' : 'No'}</div>
        <div>Should Show: {!isMobile && mounted ? 'Yes' : 'No'}</div>
        <div>Saved State: {NavigationStatePersistence.loadSidebarState()?.toString() || 'None'}</div>
      </div>
      
      <div className="space-y-1">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={toggleSidebar}
          className="w-full text-xs h-6"
        >
          Toggle
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleForceOpen}
          className="w-full text-xs h-6"
        >
          Force Open
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleForceClose}
          className="w-full text-xs h-6"
        >
          Force Close
        </Button>
        <Button 
          size="sm" 
          variant="destructive" 
          onClick={handleClearSidebarState}
          className="w-full text-xs h-6"
        >
          Clear State
        </Button>
      </div>
    </div>
  );
};