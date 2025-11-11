import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MessageCircle, Users, TrendingUp, Award } from 'lucide-react';
import { Bill } from '../../store/slices/billsSlice';

interface BillCommunityTabProps {
  bill: Bill;
}

/**
 * BillCommunityTab - Community discussions and expert engagement
 */
function BillCommunityTab({ bill }: BillCommunityTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" style={{ color: 'hsl(var(--civic-community))' }} />
            Community Discussion
          </CardTitle>
          <CardDescription>
            Join the conversation with experts and community members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              💬 Community Features Coming Soon
            </h3>
            <p className="text-blue-800 mb-4">
              Discussion threads, expert verification, and community engagement 
              features will be implemented in future tasks.
            </p>
            <div className="text-sm text-blue-700">
              <strong>Planned Features:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Nested discussion threads (5 levels)</li>
                <li>Expert verification badges</li>
                <li>Real-time comment updates</li>
                <li>Community voting and moderation</li>
                <li>Sentiment analysis and tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--civic-expert))' }} />
            Engagement Analytics
          </CardTitle>
          <CardDescription>
            Community participation and sentiment metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-community))' }}>
                {bill.commentCount}
              </div>
              <div className="text-sm text-muted-foreground">Comments</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-expert))' }}>
                12
              </div>
              <div className="text-sm text-muted-foreground">Expert Contributors</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-transparency))' }}>
                78%
              </div>
              <div className="text-sm text-muted-foreground">Positive Sentiment</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-constitutional))' }}>
                156
              </div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expert Insights Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" style={{ color: 'hsl(var(--civic-expert))' }} />
            Expert Insights
          </CardTitle>
          <CardDescription>
            Verified expert analysis and commentary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">Dr. Sarah Johnson</div>
                  <div className="text-sm text-muted-foreground">Constitutional Law Expert</div>
                </div>
                <div className="ml-auto">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Verified Expert
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                "This legislation raises important questions about federal vs. state authority. 
                The provisions in Section 3 may require careful constitutional review..."
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Healthcare Policy Institute</div>
                  <div className="text-sm text-muted-foreground">Policy Research Organization</div>
                </div>
                <div className="ml-auto">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Official Analysis
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                "Our analysis indicates this bill could significantly improve healthcare access 
                for underserved communities while maintaining fiscal responsibility..."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillCommunityTab;