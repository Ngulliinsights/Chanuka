/**
 * Enhanced UI Components Demo
 * Showcases all the new shadcn/ui components and enhanced versions
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './navigation-menu';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './context-menu';
import {
  EnhancedTabs,
  EnhancedTooltip,
  EnhancedAvatar,
  EnhancedProgress,
  EnhancedBadge,
} from './enhanced-components';
import { 
  Search, 
  Settings, 
  User, 
  FileText, 
  Home, 
  Calendar,
  Mail,
  MessageSquare,
  Bell,
  Copy,
  Edit,
  Trash2,
  Download
} from 'lucide-react';

export const EnhancedUIDemo: React.FC = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [tabAnalytics, setTabAnalytics] = useState<Array<{ tabId: string; timeSpent: number }>>([]);
  const [progressValue, setProgressValue] = useState(45);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleTabAnalytics = (tabId: string, analytics: { timeSpent: number; previousTab?: string }) => {
    setTabAnalytics(prev => [...prev, { tabId, timeSpent: analytics.timeSpent }]);
  };

  const handleProgressIncrease = () => {
    setProgressValue(prev => Math.min(prev + 10, 100));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Enhanced shadcn/ui Components</h1>
        <p className="text-muted-foreground">
          Complete implementation of shadcn/ui with Radix UI primitives and business logic enhancements
        </p>
      </div>

      {/* Navigation Menu Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Menu</CardTitle>
          <CardDescription>
            Accessible navigation menu with keyboard support and animations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <a
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          href="/"
                        >
                          <Home className="h-6 w-6" />
                          <div className="mb-2 mt-4 text-lg font-medium">
                            shadcn/ui
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            Beautifully designed components built with Radix UI and Tailwind CSS.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="/docs" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          <div className="text-sm font-medium leading-none">Introduction</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Re-usable components built using Radix UI and Tailwind CSS.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="/docs/installation" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          <div className="text-sm font-medium leading-none">Installation</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            How to install dependencies and structure your app.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Components</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {[
                      { title: "Alert Dialog", href: "/docs/primitives/alert-dialog", description: "A modal dialog that interrupts the user with important content." },
                      { title: "Hover Card", href: "/docs/primitives/hover-card", description: "For sighted users to preview content available behind a link." },
                      { title: "Progress", href: "/docs/primitives/progress", description: "Displays an indicator showing the completion progress of a task." },
                      { title: "Scroll-area", href: "/docs/primitives/scroll-area", description: "Visually or semantically separates content." },
                      { title: "Tabs", href: "/docs/primitives/tabs", description: "A set of layered sections of content—known as tab panels." },
                      { title: "Tooltip", href: "/docs/primitives/tooltip", description: "A popup that displays information related to an element." },
                    ].map((component) => (
                      <li key={component.title}>
                        <NavigationMenuLink asChild>
                          <a
                            href={component.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">{component.title}</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {component.description}
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </CardContent>
      </Card>

      {/* Command Palette Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Command Palette</CardTitle>
          <CardDescription>
            Fast, composable, unstyled command menu. Press ⌘K to open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setCommandOpen(true)} variant="outline" className="w-full justify-start">
            <Search className="mr-2 h-4 w-4" />
            Search commands...
            <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Calendar</span>
                </CommandItem>
                <CommandItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Search Emoji</span>
                </CommandItem>
                <CommandItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Mail</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notifications</span>
                  <CommandShortcut>⌘N</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </CardContent>
      </Card>

      {/* Context Menu Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Context Menu</CardTitle>
          <CardDescription>
            Right-click on the area below to see the context menu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContextMenu>
            <ContextMenuTrigger className="flex h-[150px] w-full items-center justify-center rounded-md border border-dashed text-sm">
              Right click here
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
              <ContextMenuItem inset>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </ContextMenuItem>
              <ContextMenuItem inset>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </ContextMenuItem>
              <ContextMenuItem inset>
                <Download className="mr-2 h-4 w-4" />
                Download
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem inset className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </CardContent>
      </Card>

      {/* Enhanced Components Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Components</CardTitle>
          <CardDescription>
            Business logic enhanced versions with analytics and advanced features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Tabs */}
          <div>
            <h4 className="text-sm font-medium mb-3">Enhanced Tabs with Analytics</h4>
            <EnhancedTabs
              defaultValue="overview"
              trackAnalytics={true}
              onTabChange={handleTabAnalytics}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This tab tracks time spent and provides analytics data.
                </p>
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tab analytics data:
                </p>
                <div className="space-y-2">
                  {tabAnalytics.map((item, index) => (
                    <div key={index} className="text-xs bg-muted p-2 rounded">
                      Tab: {item.tabId}, Time: {(item.timeSpent / 1000).toFixed(1)}s
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="reports" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Reports and detailed analytics will be shown here.
                </p>
              </TabsContent>
            </EnhancedTabs>
          </div>

          {/* Enhanced Avatar */}
          <div>
            <h4 className="text-sm font-medium mb-3">Enhanced Avatar with Status</h4>
            <div className="flex items-center space-x-4">
              <EnhancedAvatar
                src="https://github.com/shadcn.png"
                alt="@shadcn"
                fallback="CN"
                status="online"
                size="lg"
              />
              <EnhancedAvatar
                src="invalid-url"
                alt="@user"
                fallback="U"
                status="away"
                size="md"
                showLoadingState={true}
              />
              <EnhancedAvatar
                fallback="OF"
                status="offline"
                size="sm"
              />
            </div>
          </div>

          {/* Enhanced Progress */}
          <div>
            <h4 className="text-sm font-medium mb-3">Enhanced Progress with Milestones</h4>
            <div className="space-y-4">
              <EnhancedProgress
                value={progressValue}
                showPercentage={true}
                showMilestones={true}
                milestones={[25, 50, 75]}
                animated={true}
                color="default"
                onMilestoneReached={(milestone) => {
                  console.log(`Milestone reached: ${milestone}%`);
                }}
              />
              <Button onClick={handleProgressIncrease} size="sm">
                Increase Progress (+10%)
              </Button>
            </div>
          </div>

          {/* Enhanced Badges */}
          <div>
            <h4 className="text-sm font-medium mb-3">Enhanced Badges</h4>
            <div className="flex flex-wrap gap-2">
              <EnhancedBadge
                variant="default"
                animated={true}
                interactive={true}
                onClick={() => console.log('Badge clicked')}
              >
                Interactive
              </EnhancedBadge>
              <EnhancedBadge
                variant="secondary"
                showRemove={true}
                onRemove={() => console.log('Badge removed')}
              >
                Removable
              </EnhancedBadge>
              <EnhancedBadge
                variant="outline"
                size="lg"
                animated={true}
              >
                Large Animated
              </EnhancedBadge>
            </div>
          </div>

          {/* Enhanced Tooltip */}
          <div>
            <h4 className="text-sm font-medium mb-3">Enhanced Tooltip with Analytics</h4>
            <EnhancedTooltip
              content="This tooltip tracks interactions and provides analytics"
              trackInteractions={true}
              onShow={() => console.log('Tooltip shown')}
              onHide={() => console.log('Tooltip hidden')}
            >
              <Button variant="outline">Hover for tooltip</Button>
            </EnhancedTooltip>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Summary</CardTitle>
          <CardDescription>
            Complete shadcn/ui and Radix UI implementation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Implemented Components</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Navigation Menu (NEW)</li>
                <li>• Command Palette (NEW)</li>
                <li>• Context Menu (NEW)</li>
                <li>• Enhanced Tabs with Analytics</li>
                <li>• Enhanced Tooltip with Tracking</li>
                <li>• Enhanced Avatar with Status</li>
                <li>• Enhanced Progress with Milestones</li>
                <li>• Enhanced Badge with Interactions</li>
                <li>• All existing shadcn/ui components</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🎯 Key Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• WCAG 2.1 AA Accessibility</li>
                <li>• Keyboard Navigation</li>
                <li>• Analytics Integration</li>
                <li>• Error Recovery</li>
                <li>• Performance Optimized</li>
                <li>• Mobile Responsive</li>
                <li>• TypeScript Support</li>
                <li>• Customizable Theming</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};