import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { SECTION_ORDER } from '@client/constants';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Separator } from '@client/components/ui/separator';
import { 
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut
} from '@client/components/ui/command';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@client/components/ui/navigation-menu';
import { navigationUtils } from '@client/utils/navigation';
import { Search, PanelLeftClose, ChevronLeft, ChevronRight } from 'lucide-react';

import { useNav } from '../hooks/useNav';
import { NavSection } from './NavSection';

export const DesktopSidebar = React.memo(() => {
  const { items, user_role, isAuthenticated } = useNav();
  const location = useLocation();
  const navigate = useNavigate();
  
  const prevStateRef = useRef({ items, user_role, isAuthenticated });
  const stableItemsRef = useRef(items);
  
  // Enhanced state management
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  // Validate and filter navigation items using consolidated utilities
  const validatedItems = useMemo(() => {
    return navigationUtils.filterNavigationByAccess(
      navigationUtils.validateNavigationItems(items),
      user_role,
      isAuthenticated
    );
  }, [items, user_role, isAuthenticated]);
  
  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return validatedItems;
    return navigationUtils.searchNavigationItems(searchQuery, validatedItems);
  }, [validatedItems, searchQuery]);
  
  // Memoize filtered sections to prevent unnecessary re-renders during navigation transitions
  const sectionItems = useMemo(() => {
    // Only update if items actually changed (not just reference)
    const currentState = { items: filteredItems, user_role, isAuthenticated };
    const hasStateChanged = (
      prevStateRef.current.items !== filteredItems ||
      prevStateRef.current.user_role !== user_role ||
      prevStateRef.current.isAuthenticated !== isAuthenticated
    );
    
    if (hasStateChanged) {
      prevStateRef.current = currentState;
      stableItemsRef.current = filteredItems;
    }
    
    // Use stable reference to prevent filtering on every render
    const stableItems = stableItemsRef.current;
    
    return SECTION_ORDER.map((section) => ({
      section,
      items: stableItems.filter((item) => item.section === section)
    }));
  }, [filteredItems, user_role, isAuthenticated]);
  
  // Add keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandPalette(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  // Track component mount state to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleItemClick = (item: any) => {
    navigationUtils.trackNavigationEvent('navigation_click', {
      item,
      source: 'desktop_sidebar'
    });
    navigate(item.href);
  };
  
  return (
    <>
      {/* Command Palette */}
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            {validatedItems.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  navigate(item.href);
                  setShowCommandPalette(false);
                }}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
                {item.badge && (
                  <CommandShortcut>{item.badge}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => {
              setIsCollapsed(!isCollapsed);
              setShowCommandPalette(false);
            }}>
              <PanelLeftClose className="h-4 w-4" />
              <span className="ml-2">Toggle Sidebar</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => {
              setSearchQuery('');
              setShowCommandPalette(false);
            }}>
              <Search className="h-4 w-4" />
              <span className="ml-2">Clear Search</span>
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <aside className={`chanuka-sidebar ${isCollapsed ? 'chanuka-sidebar-collapsed' : 'chanuka-sidebar-expanded'} flex flex-col h-full bg-background border-r border-border transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold">Navigation</h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCommandPalette(true)}
                  className="px-2"
                >
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 h-10 ${
                    isCollapsed ? 'px-2' : ''
                  } ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {!isCollapsed && isAuthenticated && (
          <div className="p-4 border-t border-border">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    U
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      User
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user_role || 'Member'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </aside>
    </>
  );
        {sectionItems.map(({ section, items: sectionItemList }) => (
          <NavSection
            key={section}
            section={section}
            items={sectionItemList}
          />
        ))}
      </nav>
    </aside>
  );
});

