/**
 * Personalized Dashboard Preview Component
 *
 * Shows a preview of the user's dashboard based on their persona
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Target,
  ChevronRight,
  BookOpen,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@client/shared/design-system';

interface PersonalizedDashboardPreviewProps {
  persona: 'novice' | 'intermediate' | 'expert';
  userId: string;
}

const PersonalizedDashboardPreview: React.FC<PersonalizedDashboardPreviewProps> = ({
  persona,
  userId: _userId
}) => {
  const getPersonaContent = (persona: 'novice' | 'intermediate' | 'expert') => {
    switch (persona) {
      case 'novice':
        return {
          title: 'Your Civic Journey Starts Here',
          description: 'Simple tools to help you understand and engage with legislation',
          widgets: [
            {
              title: 'Getting Started',
              description: 'Learn the basics of civic engagement',
              icon: BookOpen,
              color: 'from-blue-500 to-blue-600',
              value: '3 of 5 steps completed',
              action: 'Continue Learning'
            },
            {
              title: 'Popular Bills',
              description: 'Bills that matter to your community',
              icon: FileText,
              color: 'from-green-500 to-green-600',
              value: '5 trending bills',
              action: 'Explore Bills'
            },
            {
              title: 'Community Welcome',
              description: 'Connect with other citizens',
              icon: Users,
              color: 'from-purple-500 to-purple-600',
              value: '127 new members',
              action: 'Join Discussion'
            }
          ]
        };

      case 'intermediate':
        return {
          title: 'Your Civic Engagement Dashboard',
          description: 'Track your interests and stay informed about legislative developments',
          widgets: [
            {
              title: 'Tracked Bills',
              description: 'Bills you are following',
              icon: FileText,
              color: 'from-blue-500 to-blue-600',
              value: '12 active bills',
              action: 'View All'
            },
            {
              title: 'Recent Activity',
              description: 'Your civic engagement summary',
              icon: BarChart3,
              color: 'from-green-500 to-green-600',
              value: '8 actions this week',
              action: 'View Details'
            },
            {
              title: 'Recommendations',
              description: 'Bills that might interest you',
              icon: TrendingUp,
              color: 'from-orange-500 to-orange-600',
              value: '4 new suggestions',
              action: 'Explore'
            }
          ]
        };

      case 'expert':
        return {
          title: 'Professional Legislative Intelligence',
          description: 'Advanced tools and analytics for policy professionals',
          widgets: [
            {
              title: 'Advanced Analytics',
              description: 'Legislative trends and patterns',
              icon: BarChart3,
              color: 'from-blue-500 to-blue-600',
              value: '23 insights available',
              action: 'View Analytics'
            },
            {
              title: 'Expert Tools',
              description: 'Professional analysis features',
              icon: Shield,
              color: 'from-purple-500 to-purple-600',
              value: '7 tools active',
              action: 'Access Tools'
            },
            {
              title: 'Verification Queue',
              description: 'Bills awaiting expert review',
              icon: Target,
              color: 'from-orange-500 to-orange-600',
              value: '3 pending reviews',
              action: 'Review Now'
            }
          ]
        };
    }
  };

  const content = getPersonaContent(persona);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h3>
        <p className="text-gray-600">{content.description}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {content.widgets.map((widget, index) => {
          const Icon = widget.icon;
          return (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 bg-gradient-to-br ${widget.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{widget.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">{widget.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">{widget.value}</div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    {widget.action}
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Link to="/dashboard">
          <Button size="lg" className="text-lg px-8 py-4">
            <BarChart3 className="mr-2 h-5 w-5" />
            Go to Full Dashboard
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PersonalizedDashboardPreview;
