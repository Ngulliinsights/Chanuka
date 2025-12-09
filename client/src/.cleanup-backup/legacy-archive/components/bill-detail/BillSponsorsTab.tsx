import { Users, DollarSign, Eye } from 'lucide-react';
import React from 'react';

import { Bill } from '@/core/api/types';

import { ConflictOfInterestAnalysis } from '../conflict-of-interest/ConflictOfInterestAnalysis';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface BillSponsorsTabProps {
  bill: Bill;
}

/**
 * BillSponsorsTab - Sponsor information and conflict of interest analysis
 */
function BillSponsorsTab({ bill }: BillSponsorsTabProps) {
  return (
    <div className="space-y-6">
      {/* Sponsors List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: 'hsl(var(--civic-community))' }} />
            Bill Sponsors
          </CardTitle>
          <CardDescription>
            Representatives sponsoring this legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bill.sponsors.map((sponsor, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-medium text-lg">{sponsor.name}</div>
                    <Badge
                      variant={sponsor.isPrimary ? 'default' : 'secondary'}
                      style={{
                        backgroundColor: sponsor.isPrimary ? 'hsl(var(--civic-expert))' : undefined
                      }}
                    >
                      {sponsor.isPrimary ? 'Primary Sponsor' : 'Co-sponsor'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {sponsor.party} Party
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Transparency Score: 72%
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Financial Interests: 4 disclosed
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                  <Button variant="outline" size="sm">
                    Financial Data
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Conflict of Interest Analysis */}
      <ConflictOfInterestAnalysis bill={bill} />
    </div>
  );
}

export default BillSponsorsTab;