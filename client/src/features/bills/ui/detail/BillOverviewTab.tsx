import { Calendar, Users, FileText, AlertTriangle } from 'lucide-react';
import React from 'react';

import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import type { Bill } from '@client/lib/types';

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
            <FileText className="h-5 w-5 text-primary" />
            Bill Summary
          </CardTitle>
          <CardDescription>Key provisions and purpose of {bill.billNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed mb-4">{bill.summary}</p>

          {/* Reading Time and Complexity */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {(bill as any).readingTime || '5'} min read
            </span>
            <Badge
              variant="outline"
              className={`
                ${(bill as any).complexity === 'high' ? 'border-red-300 text-red-700' : ''}
                ${(bill as any).complexity === 'medium' ? 'border-yellow-300 text-yellow-700' : ''}
                ${(bill as any).complexity === 'low' ? 'border-green-300 text-green-700' : ''}
              `}
            >
              {(bill as any).complexity || 'medium'} complexity
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Status and Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Current Status
          </CardTitle>
          <CardDescription>Legislative progress and next steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant="default">{bill.status}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Introduced:</span>
              <span className="text-muted-foreground">
                {new Date(bill.introductionDate).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Last Updated:</span>
              <span className="text-muted-foreground">
                {new Date(bill.timeline?.[bill.timeline.length - 1]?.timestamp || bill.introductionDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Sponsors
          </CardTitle>
          <CardDescription>Representatives supporting this legislation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bill.sponsors?.map((sponsor, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{sponsor.legislatorName}</div>
                  <div className="text-sm text-muted-foreground">
                    {sponsor.party} • {sponsor.state}
                  </div>
                </div>
                <Badge variant={sponsor.sponsorType === 'primary' ? 'default' : 'secondary'}>
                  {sponsor.sponsorType || 'Co-sponsor'}
                </Badge>
              </div>
            )) || <p className="text-muted-foreground">No sponsor information available</p>}
          </div>
        </CardContent>
      </Card>

      {/* Policy Areas */}
      {bill.policyAreas && bill.policyAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Policy Areas</CardTitle>
            <CardDescription>Topics and areas this bill addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bill.policyAreas.map((area, index) => (
                <Badge key={index} variant="outline">
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BillOverviewTab;
