import { Calendar, Clock, Users, Eye, Bookmark, MessageCircle, Share2 } from 'lucide-react';
import React from 'react';

import { Badge } from '@client/lib/design-system';
import type { Bill } from '@client/lib/types';

interface BillHeaderProps {
  bill: Bill;
}

/**
 * BillHeader component with semantic HTML, structured data markup, and civic color variables
 * Displays bill metadata, status, and engagement metrics
 */
export function BillHeader({ bill }: BillHeaderProps) {
  // Generate structured data for SEO and accessibility
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LegislativeProposal',
    name: bill.title,
    identifier: bill.billNumber,
    description: bill.summary,
    dateCreated: bill.introducedDate,
    dateModified: bill.lastUpdated,
    legislativeStatus: bill.status,
    sponsor: bill.sponsors?.map((sponsor: any) => ({
      '@type': 'Person',
      name: sponsor.name,
      affiliation: sponsor.party,
    })),
    about: bill.policyAreas?.map((area: string) => ({
      '@type': 'Thing',
      name: area,
    })),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'introduced':
        return 'hsl(var(--status-introduced))';
      case 'committee':
        return 'hsl(var(--status-committee))';
      case 'passed':
        return 'hsl(var(--status-passed))';
      case 'failed':
        return 'hsl(var(--status-failed))';
      case 'signed':
        return 'hsl(var(--status-signed))';
      case 'vetoed':
        return 'hsl(var(--status-vetoed))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  return (
    <header className="bill-header bg-background border-b">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Bill Title and Number */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{bill.title}</h1>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <Badge variant="outline" className="font-mono">
                {bill.billNumber}
              </Badge>
              <Badge variant="default" style={{ backgroundColor: getStatusColor(bill.status) }}>
                {bill.status}
              </Badge>
            </div>

            {/* Bill Summary */}
            {bill.summary && (
              <p className="text-muted-foreground text-lg leading-relaxed mb-4">{bill.summary}</p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Introduced: {bill.introducedDate ? new Date(bill.introducedDate).toLocaleDateString() : 'N/A'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Updated: {bill.lastUpdated ? new Date(bill.lastUpdated).toLocaleDateString() : 'N/A'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{bill.sponsors?.length || 0} Sponsors</span>
              </div>
            </div>
          </div>

          {/* Engagement Actions */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">
              <Eye className="h-4 w-4" />
              <span>Watch</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">
              <Bookmark className="h-4 w-4" />
              <span>Save</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span>Discuss</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default BillHeader;
