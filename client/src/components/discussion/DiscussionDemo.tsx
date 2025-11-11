/**
 * DiscussionDemo - Demonstration component showing discussion system usage
 * 
 * This component provides a working example of how to integrate
 * the discussion system into a bill detail page.
 */

import React, { useState } from 'react';
import { MessageSquare, Users, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DiscussionIntegration } from './DiscussionIntegration';
import { useDiscussion } from '../../hooks/useDiscussion';
import { cn } from '../../lib/utils';

interface DiscussionDemoProps {
  className?: string;
}

/**
 * DiscussionDemo - Complete demonstration of the discussion system
 * 
 * Features:
 * - Mock bill data for demonstration
 * - Real discussion functionality
 * - User role simulation (regular user vs moderator)
 * - WebSocket integration example
 */
export function DiscussionDemo({ className }: DiscussionDemoProps) {
  const [currentUserId] = useState('demo-user-123');
  const [isModerator, setIsModerator] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState(1001);

  // Mock bill data for demonstration
  const mockBills = [
    {
      id: 1001,
      title: 'Digital Privacy Protection Act',
      summary: 'Comprehensive legislation to protect citizen digital privacy rights and regulate data collection by corporations.',
      totalComments: 47,
      participantCount: 23,
      expertParticipation: 0.35,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: 1002,
      title: 'Infrastructure Investment Bill',
      summary: 'Major infrastructure spending bill focusing on roads, bridges, and digital infrastructure improvements.',
      totalComments: 89,
      participantCount: 41,
      expertParticipation: 0.28,
      lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    },
    {
      id: 1003,
      title: 'Education Reform Initiative',
      summary: 'Comprehensive education reform including curriculum updates and teacher compensation improvements.',
      totalComments: 156,
      participantCount: 67,
      expertParticipation: 0.42,
      lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    },
  ];

  const selectedBill = mockBills.find(bill => bill.id === selectedBillId);

  // Get discussion hook for the selected bill
  const {
    thread,
    loading,
    error,
  } = useDiscussion({ 
    billId: selectedBillId,
    autoSubscribe: true,
    enableTypingIndicators: true
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Demo Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Discussion System Demo
        </h2>
        
        <div className="space-y-4">
          {/* Bill Selection */}
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Select Bill to View Discussion:
            </label>
            <div className="grid gap-2">
              {mockBills.map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => setSelectedBillId(bill.id)}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-colors",
                    selectedBillId === bill.id
                      ? "border-blue-500 bg-blue-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  <div className="font-medium text-sm">{bill.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{bill.summary}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {bill.totalComments} comments
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {bill.participantCount} participants
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(bill.expertParticipation * 100)}% Expert
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Role Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-blue-800">
              User Role:
            </label>
            <Button
              variant={isModerator ? "default" : "outline"}
              size="sm"
              onClick={() => setIsModerator(!isModerator)}
            >
              {isModerator ? 'Moderator' : 'Regular User'}
            </Button>
          </div>

          {/* Demo Info */}
          <div className="text-xs text-blue-700 bg-blue-100 rounded p-2">
            <strong>Demo Features:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Real-time WebSocket integration (simulated)</li>
              <li>• Comment threading up to 5 levels deep</li>
              <li>• Community reporting and moderation system</li>
              <li>• Expert verification and credibility scoring</li>
              <li>• Quality validation and content guidelines</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Selected Bill Info */}
      {selectedBill && (
        <div className="chanuka-card">
          <div className="chanuka-card-header">
            <h3 className="text-lg font-semibold">{selectedBill.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{selectedBill.summary}</p>
          </div>
        </div>
      )}

      {/* Discussion Integration */}
      <DiscussionIntegration
        billId={selectedBillId}
        currentUserId={currentUserId}
        canModerate={isModerator}
      />

      {/* Demo Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">System Status</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">WebSocket:</span>
            <Badge variant="secondary" className="ml-2">
              {loading ? 'Connecting...' : 'Connected'}
            </Badge>
          </div>
          <div>
            <span className="text-gray-600">Thread Status:</span>
            <Badge variant={thread ? "default" : "outline"} className="ml-2">
              {thread ? 'Loaded' : 'Loading...'}
            </Badge>
          </div>
          <div>
            <span className="text-gray-600">User ID:</span>
            <code className="ml-2 text-xs bg-gray-200 px-1 rounded">{currentUserId}</code>
          </div>
          <div>
            <span className="text-gray-600">Permissions:</span>
            <Badge variant={isModerator ? "destructive" : "outline"} className="ml-2">
              {isModerator ? 'Moderator' : 'User'}
            </Badge>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}