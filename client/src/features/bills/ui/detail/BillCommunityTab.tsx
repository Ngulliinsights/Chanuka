import { MessageCircle, Users, TrendingUp, Award, Plus, Filter, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

import type { CommunityComment } from '@client/shared/types';
import { DiscussionThread, CommentForm } from '@client/features/community/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';

// TODO: ARCHITECTURAL DECISION NEEDED - Cross-feature dependency
// This should either be moved to shared/ui or use a shared interface
// For now, keeping as-is but flagged for review
import type { Bill } from '@client/shared/types';

interface BillCommunityTabProps {
  bill: Bill;
}

/**
 * BillCommunityTab - Community discussions and expert engagement
 */
function BillCommunityTab({ bill }: BillCommunityTabProps) {
  const [activeTab, setActiveTab] = useState('discussion');
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);

  // Mock community data for demonstration
  const mockDiscussionThread = {
    id: `bill-${bill.id}-discussion`,
    title: `Discussion: ${bill.title}`,
    description: 'Community discussion about this legislation',
    billId: bill.id,
    status: 'active' as const,
    commentCount: 24,
    participantCount: 18,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['legislation', 'policy', 'community'],
    isModerated: false,
  };

  const mockComments: CommunityComment[] = [
    {
      id: 'comment-1',
      content:
        'This bill addresses important issues in our community. I particularly appreciate the focus on transparency and accountability.',
      author: {
        id: 'user-1',
        name: 'Sarah Johnson',
        avatar: undefined,
        isVerified: true,
        role: 'expert',
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      upvotes: 12,
      downvotes: 2,
      replyCount: 3,
      isModerated: false,
      flagCount: 0,
      qualityScore: 85,
    },
    {
      id: 'comment-2',
      content:
        'I have concerns about the implementation timeline. Has there been consideration of the resources required?',
      author: {
        id: 'user-2',
        name: 'Michael Chen',
        avatar: undefined,
        isVerified: false,
        role: 'citizen',
      },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      upvotes: 8,
      downvotes: 1,
      replyCount: 2,
      isModerated: false,
      flagCount: 0,
      qualityScore: 78,
    },
  ];

  const mockExpertInsights = [
    {
      id: 'insight-1',
      expert: {
        name: 'Dr. Emily Rodriguez',
        credentials: 'Constitutional Law Professor',
        verification: 'Harvard Law School',
        avatar: undefined,
      },
      insight:
        'This legislation aligns well with recent Supreme Court precedents regarding federal jurisdiction.',
      confidence: 92,
      supportingEvidence: ['Case: Smith v. State (2023)', 'Federal Register Vol. 88'],
      timestamp: '3 hours ago',
      likes: 15,
    },
    {
      id: 'insight-2',
      expert: {
        name: 'Prof. David Kim',
        credentials: 'Public Policy Expert',
        verification: 'Georgetown University',
        avatar: undefined,
      },
      insight:
        'The economic impact analysis shows positive outcomes for small businesses in affected sectors.',
      confidence: 87,
      supportingEvidence: ['CBO Report 2024-15', 'Economic Analysis Brief'],
      timestamp: '5 hours ago',
      likes: 22,
    },
  ];

  const handleAddComment = async (data: any) => {
    console.log('Adding comment:', data);
    // Implementation would handle comment submission
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    console.log('Updating comment:', commentId, content);
  };

  const handleDeleteComment = async (commentId: string) => {
    console.log('Deleting comment:', commentId);
  };

  const handleVoteComment = async (commentId: string, voteType: 'up' | 'down') => {
    console.log('Voting on comment:', commentId, voteType);
  };

  const handleReportComment = async (commentId: string, violationType: any, reason: string) => {
    console.log('Reporting comment:', commentId, violationType, reason);
  };

  const handleModerateComment = async (commentId: string, action: string, reason: string) => {
    console.log('Moderating comment:', commentId, action, reason);
  };

  return (
    <div className="space-y-6">
      {/* Community Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Community Engagement
          </CardTitle>
          <CardDescription>
            Join the conversation with experts and community members about {bill.billNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">24</div>
              <div className="text-sm text-blue-800">Comments</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">18</div>
              <div className="text-sm text-green-800">Participants</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">3</div>
              <div className="text-sm text-purple-800">Expert Insights</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">89%</div>
              <div className="text-sm text-orange-800">Positive Sentiment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="experts">Expert Insights</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <TabsContent value="discussion" className="space-y-6">
          {/* Discussion Thread */}
          <DiscussionThread
            thread={mockDiscussionThread}
            comments={mockComments}
            currentUserId="current-user"
            canModerate={false}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            onVoteComment={handleVoteComment}
            onReportComment={handleReportComment}
            onModerateComment={handleModerateComment}
          />
        </TabsContent>

        <TabsContent value="experts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Expert Insights</h3>
            <Badge variant="secondary">{mockExpertInsights.length} verified experts</Badge>
          </div>

          <div className="space-y-4">
            {mockExpertInsights.map(insight => (
              <Card key={insight.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Award className="h-6 w-6 text-purple-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{insight.expert.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          Verified Expert
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {insight.expert.credentials}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.expert.verification}
                      </p>

                      <p className="mb-4">{insight.insight}</p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Confidence:</span>
                          <Badge variant="outline" className="text-green-700">
                            {insight.confidence}%
                          </Badge>
                        </div>

                        <div>
                          <span className="text-sm font-medium">Supporting Evidence:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {insight.supportingEvidence.map((evidence, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {evidence}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{insight.timestamp}</span>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          👍 {insight.likes}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Sentiment Analysis
              </CardTitle>
              <CardDescription>
                Community sentiment and engagement trends for this bill
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Sentiment */}
                <div>
                  <h4 className="font-medium mb-3">Overall Sentiment</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">67%</div>
                      <div className="text-sm text-green-800">Positive</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-2xl font-bold text-gray-600">22%</div>
                      <div className="text-sm text-gray-800">Neutral</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">11%</div>
                      <div className="text-sm text-red-800">Negative</div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Key Topics */}
                <div>
                  <h4 className="font-medium mb-3">Key Discussion Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Implementation Timeline',
                      'Budget Impact',
                      'Constitutional Issues',
                      'Public Benefits',
                      'Enforcement Mechanisms',
                    ].map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Engagement Trends */}
                <div>
                  <h4 className="font-medium mb-3">Engagement Trends</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>• Peak discussion time: 2-4 PM EST</div>
                    <div>• Most active day: Tuesday</div>
                    <div>• Average comment length: 127 characters</div>
                    <div>• Expert participation: 18% of comments</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BillCommunityTab;
