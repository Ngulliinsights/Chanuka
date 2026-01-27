import { Users, DollarSign, Eye, MapPin, Calendar, ExternalLink } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@client/lib/design-system';
import { Separator } from '@client/lib/design-system';
import type { Bill } from '@client/lib/types';

interface BillSponsorsTabProps {
  bill: Bill;
}

/**
 * BillSponsorsTab - Sponsor information and conflict of interest analysis
 */
function BillSponsorsTab({ bill }: BillSponsorsTabProps) {
  // Mock additional sponsor data for demonstration
  const enhancedSponsors =
    bill.sponsors?.map(sponsor => ({
      ...sponsor,
      avatar: undefined, // Would come from API
      district: sponsor.state
        ? `${sponsor.state}-${Math.floor(Math.random() * 20) + 1}`
        : undefined,
      yearsInOffice: Math.floor(Math.random() * 20) + 1,
      committeeMemberships: ['Judiciary', 'Commerce', 'Energy'].slice(
        0,
        Math.floor(Math.random() * 3) + 1
      ),
      contactInfo: {
        phone: '(202) 225-0000',
        email: `${sponsor.legislatorName?.toLowerCase().replace(' ', '.')}@house.gov`,
        website: `https://house.gov/${sponsor.legislatorName?.toLowerCase().replace(' ', '-')}`,
      },
      votingRecord: {
        totalVotes: Math.floor(Math.random() * 1000) + 500,
        attendance: Math.floor(Math.random() * 20) + 80,
        bipartisanScore: Math.floor(Math.random() * 40) + 30,
      },
    })) || [];

  const primarySponsor = enhancedSponsors.find(s => s.sponsorType === 'primary');
  const coSponsors = enhancedSponsors.filter(s => s.sponsorType !== 'primary');

  return (
    <div className="space-y-6">
      {/* Primary Sponsor */}
      {primarySponsor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Primary Sponsor
            </CardTitle>
            <CardDescription>The representative who introduced this legislation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={primarySponsor.avatar} alt={primarySponsor.legislatorName} />
                <AvatarFallback className="text-lg">
                  {primarySponsor.legislatorName
                    ?.split(' ')
                    .map(n => n[0])
                    .join('') || 'SP'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{primarySponsor.legislatorName}</h3>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    Primary Sponsor
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Party:</span>
                      <Badge variant="outline">{primarySponsor.party}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {primarySponsor.state} - District {primarySponsor.district}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{primarySponsor.yearsInOffice} years in office</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Committees:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {primarySponsor.committeeMemberships?.map((committee, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {committee}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Voting Record:</span>
                      <div className="text-muted-foreground">
                        {primarySponsor.votingRecord?.attendance}% attendance •
                        {primarySponsor.votingRecord?.bipartisanScore}% bipartisan
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financial Interests
                  </Button>
                  <Button variant="outline" size="sm">
                    Contact
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Co-Sponsors */}
      {coSponsors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Co-Sponsors ({coSponsors.length})
            </CardTitle>
            <CardDescription>Representatives supporting this legislation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coSponsors.map((sponsor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={sponsor.avatar} alt={sponsor.legislatorName} />
                      <AvatarFallback>
                        {sponsor.legislatorName
                          ?.split(' ')
                          .map(n => n[0])
                          .join('') || 'CS'}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="font-medium">{sponsor.legislatorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {sponsor.party} • {sponsor.state}
                        {sponsor.district && ` - District ${sponsor.district}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Co-sponsor</Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sponsor Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Sponsor Analysis
          </CardTitle>
          <CardDescription>Financial interests and potential conflicts of interest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Party Breakdown */}
            <div>
              <h4 className="font-medium mb-3">Party Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Republican', 'Democrat', 'Independent'].map(party => {
                  const count = enhancedSponsors.filter(s => s.party === party).length;
                  const percentage =
                    enhancedSponsors.length > 0
                      ? ((count / enhancedSponsors.length) * 100).toFixed(0)
                      : 0;

                  return (
                    <div key={party} className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">{party}</div>
                      <div className="text-xs text-muted-foreground">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Bipartisan Support */}
            <div>
              <h4 className="font-medium mb-3">Bipartisan Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-800">Bipartisan Support</div>
                  <div className="text-xs text-green-600">
                    {enhancedSponsors.filter(s => s.party === 'Republican').length > 0 &&
                    enhancedSponsors.filter(s => s.party === 'Democrat').length > 0
                      ? 'Yes - Cross-party support detected'
                      : 'No - Single party support'}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800">Average Bipartisan Score</div>
                  <div className="text-xs text-blue-600">
                    {enhancedSponsors.length > 0
                      ? `${Math.round(enhancedSponsors.reduce((acc, s) => acc + (s.votingRecord?.bipartisanScore || 0), 0) / enhancedSponsors.length)}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Committee Representation */}
            <div>
              <h4 className="font-medium mb-3">Committee Representation</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set(enhancedSponsors.flatMap(s => s.committeeMemberships || []))
                ).map(committee => (
                  <Badge key={committee} variant="outline" className="text-sm">
                    {committee}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Your Representatives</CardTitle>
          <CardDescription>
            Reach out to sponsors to share your views on this legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Email All Sponsors</span>
              <span className="text-sm text-muted-foreground">Send your thoughts via email</span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Find Your Representative</span>
              <span className="text-sm text-muted-foreground">
                Contact your local representative
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Schedule Meetings</span>
              <span className="text-sm text-muted-foreground">Request in-person meetings</span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Social Media</span>
              <span className="text-sm text-muted-foreground">Engage on social platforms</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillSponsorsTab;
