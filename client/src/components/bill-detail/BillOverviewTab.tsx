import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Users, FileText, AlertTriangle } from 'lucide-react';
import { Bill } from '@/core/api/types';
import { EducationalTooltip } from '../education/EducationalTooltip';

interface BillOverviewTabProps {
  bill: Bill;
}

/**
 * BillOverviewTab - Overview content for bill details
 * Displays summary, status, committees, and key information
 */
function BillOverviewTab({ bill }: BillOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Bill Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: 'hsl(var(--civic-expert))' }} />
            Bill Summary
          </CardTitle>
          <CardDescription>
            Key provisions and purpose of {bill.billNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed mb-4">
            {bill.summary}
          </p>
          
          {/* Reading Time and Complexity */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {bill.readingTime} min read
            </span>
            <Badge 
              variant="outline"
              className={`
                ${bill.complexity === 'high' ? 'border-red-300 text-red-700' : ''}
                ${bill.complexity === 'medium' ? 'border-yellow-300 text-yellow-700' : ''}
                ${bill.complexity === 'low' ? 'border-green-300 text-green-700' : ''}
              `}
            >
              {bill.complexity} complexity
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>
            Legislative progress and timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">Status</div>
                <div className="text-sm text-muted-foreground">
                  Last updated {new Date(bill.lastUpdated).toLocaleDateString()}
                </div>
              </div>
              <Badge 
                variant="outline"
                className="chanuka-status-badge"
                style={{ 
                  backgroundColor: `hsl(var(--status-${bill.status}))`,
                  color: 'white',
                  borderColor: `hsl(var(--status-${bill.status}))`
                }}
              >
                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
              </Badge>
            </div>

            {/* Timeline placeholder */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Legislative Timeline</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Introduced: {new Date(bill.introducedDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Committee Review: In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Floor Vote: Pending</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Committee Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: 'hsl(var(--civic-community))' }} />
            <EducationalTooltip
              term="Committee Assignment"
              definition="The process by which bills are referred to specific parliamentary committees for detailed review and analysis"
              context="procedural"
              examples={[
                "Health bills go to the Health Committee",
                "Budget bills are reviewed by the Finance Committee"
              ]}
              relatedTerms={["Committee Stage", "Parliamentary Procedure", "Bill Review"]}
            >
              Committee Assignments
            </EducationalTooltip>
          </CardTitle>
          <CardDescription>
            Committees reviewing this legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Mock committee data - in real implementation, this would come from bill data */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Health and Human Services</div>
                <div className="text-sm text-muted-foreground">Primary Committee</div>
              </div>
              <Button variant="outline" size="sm">
                View Committee
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Budget and Finance</div>
                <div className="text-sm text-muted-foreground">Secondary Review</div>
              </div>
              <Button variant="outline" size="sm">
                View Committee
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constitutional Flags (if any) */}
      {bill.constitutionalFlags.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <EducationalTooltip
                term="Constitutional Considerations"
                definition="Potential conflicts or concerns regarding how a bill aligns with constitutional principles and rights"
                context="constitutional"
                examples={[
                  "Bills that may infringe on fundamental rights",
                  "Legislation that affects the separation of powers"
                ]}
                relatedTerms={["Constitutional Review", "Judicial Review", "Bill of Rights"]}
              >
                <span className="text-yellow-800">Constitutional Considerations</span>
              </EducationalTooltip>
            </CardTitle>
            <CardDescription className="text-yellow-700">
              This bill has been flagged for constitutional review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bill.constitutionalFlags.map((flag, index) => (
                <div key={flag.id || index} className="p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-yellow-900">{flag.type}</div>
                    <Badge 
                      variant="outline"
                      className={`
                        ${flag.severity === 'critical' ? 'border-red-300 text-red-700 bg-red-50' : ''}
                        ${flag.severity === 'high' ? 'border-orange-300 text-orange-700 bg-orange-50' : ''}
                        ${flag.severity === 'medium' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' : ''}
                        ${flag.severity === 'low' ? 'border-blue-300 text-blue-700 bg-blue-50' : ''}
                      `}
                    >
                      {flag.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-yellow-800">{flag.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Sponsors */}
      <Card>
        <CardHeader>
          <CardTitle>Key Sponsors</CardTitle>
          <CardDescription>
            Primary and co-sponsors of this legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bill.sponsors.map((sponsor, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{sponsor.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {sponsor.party} • {sponsor.isPrimary ? 'Primary Sponsor' : 'Co-sponsor'}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillOverviewTab;