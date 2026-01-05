import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Users,
  FileText,
  Gavel,
  PenTool
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { cn } from '@client/shared/design-system/utils/cn';

import type { Bill } from '@client/features/bills/types';

interface BillTimelineTabProps {
  bill: Bill;
}

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming' | 'blocked';
  type: 'introduction' | 'committee' | 'debate' | 'vote' | 'signature' | 'implementation';
  details?: string;
  nextSteps?: string[];
  stakeholders?: string[];
}

const statusIcons = {
  completed: CheckCircle,
  current: Clock,
  upcoming: Calendar,
  blocked: AlertCircle
};

const statusColors = {
  completed: 'text-green-600 bg-green-100',
  current: 'text-blue-600 bg-blue-100',
  upcoming: 'text-gray-600 bg-gray-100',
  blocked: 'text-red-600 bg-red-100'
};

const typeIcons = {
  introduction: FileText,
  committee: Users,
  debate: Gavel,
  vote: CheckCircle,
  signature: PenTool,
  implementation: ArrowRight
};

/**
 * BillTimelineTab Component
 *
 * Displays a comprehensive timeline of bill progress with status updates,
 * next steps, and stakeholder information. Provides visual progress tracking
 * and actionable insights for users following the bill.
 */
export default function BillTimelineTab({ bill }: BillTimelineTabProps) {
  // Mock timeline data - in production, this would come from the API
  const timelineEvents: TimelineEvent[] = [
    {
      id: '1',
      date: '2024-01-15',
      title: 'Bill Introduced',
      description: 'Bill formally introduced in the National Assembly',
      status: 'completed',
      type: 'introduction',
      details: 'Introduced by Hon. Sarah Wanjiku with 12 co-sponsors',
      stakeholders: ['Hon. Sarah Wanjiku', 'Environment Committee']
    },
    {
      id: '2',
      date: '2024-02-01',
      title: 'First Reading',
      description: 'Bill read for the first time and referred to committee',
      status: 'completed',
      type: 'committee',
      details: 'Referred to Environment and Natural Resources Committee',
      stakeholders: ['Environment Committee', 'Committee Clerk']
    },
    {
      id: '3',
      date: '2024-02-15',
      title: 'Committee Review',
      description: 'Detailed committee examination and public hearings',
      status: 'completed',
      type: 'committee',
      details: 'Public hearings conducted with 45 submissions received',
      stakeholders: ['Environment Committee', 'Public Participants', 'Expert Witnesses']
    },
    {
      id: '4',
      date: '2024-03-01',
      title: 'Committee Report',
      description: 'Committee report tabled with recommendations',
      status: 'current',
      type: 'committee',
      details: 'Committee recommends passage with 3 amendments',
      nextSteps: [
        'Schedule second reading debate',
        'Address committee amendments',
        'Prepare for floor debate'
      ],
      stakeholders: ['Environment Committee', 'Parliamentary Clerk']
    },
    {
      id: '5',
      date: '2024-03-15',
      title: 'Second Reading',
      description: 'General debate on bill principles and committee report',
      status: 'upcoming',
      type: 'debate',
      details: 'Scheduled for March 15, 2024 parliamentary session',
      nextSteps: [
        'MPs debate bill principles',
        'Vote on second reading',
        'Proceed to committee of the whole'
      ],
      stakeholders: ['All MPs', 'Speaker of National Assembly']
    },
    {
      id: '6',
      date: '2024-03-22',
      title: 'Committee of the Whole',
      description: 'Clause-by-clause examination and amendments',
      status: 'upcoming',
      type: 'debate',
      nextSteps: [
        'Examine each clause',
        'Consider proposed amendments',
        'Vote on amendments'
      ],
      stakeholders: ['All MPs', 'Parliamentary Counsel']
    },
    {
      id: '7',
      date: '2024-03-29',
      title: 'Third Reading',
      description: 'Final debate and voting on the bill',
      status: 'upcoming',
      type: 'vote',
      nextSteps: [
        'Final debate on amended bill',
        'Vote on third reading',
        'Send to Senate if passed'
      ],
      stakeholders: ['All MPs', 'Speaker of National Assembly']
    },
    {
      id: '8',
      date: 'TBD',
      title: 'Presidential Assent',
      description: 'President signs bill into law',
      status: 'upcoming',
      type: 'signature',
      nextSteps: [
        'Presidential review',
        'Sign into law or return with memorandum',
        'Gazette as Act of Parliament'
      ],
      stakeholders: ['President', 'Attorney General']
    }
  ];

  const currentEventIndex = timelineEvents.findIndex(event => event.status === 'current');
  const progressPercentage = currentEventIndex >= 0
    ? ((currentEventIndex + 0.5) / timelineEvents.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Bill Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-blue-900">Current Stage</h4>
                <p className="text-blue-700">
                  {timelineEvents.find(e => e.status === 'current')?.title || 'In Progress'}
                </p>
              </div>
              <Badge className="bg-blue-600 text-white">
                {bill.status?.toUpperCase() || 'ACTIVE'}
              </Badge>
            </div>

            {/* Next Steps Summary */}
            {currentEventIndex >= 0 && timelineEvents[currentEventIndex].nextSteps && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Immediate Next Steps</h4>
                <ul className="space-y-1">
                  {timelineEvents[currentEventIndex].nextSteps!.slice(0, 3).map((step, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-gray-500" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {timelineEvents.map((event, index) => {
                const StatusIcon = statusIcons[event.status];
                const TypeIcon = typeIcons[event.type];
                const isLast = index === timelineEvents.length - 1;

                return (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Timeline Node */}
                    <div className={cn(
                      "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2",
                      statusColors[event.status],
                      event.status === 'current' && "ring-2 ring-blue-200"
                    )}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 pb-6">
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold">{event.title}</h3>
                          </div>
                          <div className="text-sm text-gray-500">
                            {event.date === 'TBD' ? 'To Be Determined' :
                             new Date(event.date).toLocaleDateString()}
                          </div>
                        </div>

                        <p className="text-gray-700 mb-3">{event.description}</p>

                        {event.details && (
                          <div className="mb-3 p-3 bg-gray-50 rounded text-sm">
                            <strong>Details:</strong> {event.details}
                          </div>
                        )}

                        {event.nextSteps && (
                          <div className="mb-3">
                            <h4 className="font-medium mb-2">Next Steps:</h4>
                            <ul className="space-y-1">
                              {event.nextSteps.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-center gap-2 text-sm">
                                  <ArrowRight className="h-3 w-3 text-blue-500" />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {event.stakeholders && (
                          <div>
                            <h4 className="font-medium mb-2">Key Stakeholders:</h4>
                            <div className="flex flex-wrap gap-1">
                              {event.stakeholders.map((stakeholder, stakeholderIndex) => (
                                <Badge key={stakeholderIndex} variant="outline" className="text-xs">
                                  {stakeholder}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Subscribe to Updates
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Download Timeline
            </Button>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Contact Stakeholders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
