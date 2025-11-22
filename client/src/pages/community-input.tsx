import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import AppLayout from '@client/components/layout/app-layout';
import CommunityHub from '@client/components/community/CommunityHub';
import { MessageSquare, BarChart3, Megaphone, Send } from 'lucide-react';

/**
 * Community Input Page - Integrated with real API and components
 * 
 * This page serves as the main hub for community engagement, featuring:
 * - Real-time discussions with voting and interaction
 * - Community polls for gathering opinions on legislation
 * - Feedback submission system for platform improvements
 * - Announcement viewing for official updates
 * 
 * The CommunityHub component handles all data fetching, state management,
 * and real-time updates through the API layer.
 */
export default function CommunityInput() {
  // Track which tab is currently active
  const [activeTab, setActiveTab] = useState('community');

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Main navigation tabs for different community features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab list with responsive design - shows icons on mobile, full text on desktop */}
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Community Hub</span>
              <span className="sm:hidden">Hub</span>
            </TabsTrigger>
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Discussions</span>
              <span className="sm:hidden">Talk</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Announcements</span>
              <span className="sm:hidden">News</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
              <span className="sm:hidden">Send</span>
            </TabsTrigger>
          </TabsList>

          {/* Community Hub Tab - Fully integrated with real API */}
          <TabsContent value="community" className="mt-0">
            <CommunityHub />
          </TabsContent>

          {/* Discussions Tab - Uses the same CommunityHub component */}
          <TabsContent value="discussions" className="mt-0">
            <CommunityHub />
          </TabsContent>

          {/* Announcements Tab - Placeholder for future implementation */}
          <TabsContent value="announcements" className="mt-0">
            <div className="text-center py-12">
              <Megaphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Announcements Coming Soon
              </h3>
              <p className="text-gray-500">
                Official platform announcements and updates will appear here.
              </p>
            </div>
          </TabsContent>

          {/* Feedback Tab - Placeholder for future implementation */}
          <TabsContent value="feedback" className="mt-0">
            <div className="text-center py-12">
              <Send className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Feedback System Coming Soon
              </h3>
              <p className="text-gray-500">
                Share your thoughts and suggestions about the platform.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}