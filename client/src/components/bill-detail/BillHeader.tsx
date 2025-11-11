import React from 'react';
import { Badge } from '../ui/badge';
import { Calendar, Clock, Users, Eye, Bookmark, MessageCircle, Share2 } from 'lucide-react';
import { Bill } from '../../store/slices/billsSlice';

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
    "@context": "https://schema.org",
    "@type": "LegislativeProposal",
    "name": bill.title,
    "identifier": bill.billNumber,
    "description": bill.summary,
    "dateCreated": bill.introducedDate,
    "dateModified": bill.lastUpdated,
    "legislativeStatus": bill.status,
    "sponsor": bill.sponsors.map(sponsor => ({
      "@type": "Person",
      "name": sponsor.name,
      "affiliation": sponsor.party
    })),
    "about": bill.policyAreas.map(area => ({
      "@type": "Thing",
      "name": area
    }))
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
        return 'hsl(var(--muted-foreground))';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'hsl(var(--civic-urgent))';
      case 'high':
        return 'hsl(var(--civic-urgent) / 0.8)';
      case 'medium':
        return 'hsl(var(--civic-constitutional))';
      case 'low':
        return 'hsl(var(--civic-community))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="bill-header mb-8" role="banner">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          {/* Bill Title and Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 
                className="text-2xl lg:text-3xl font-bold text-foreground leading-tight"
                style={{ color: 'hsl(var(--civic-expert))' }}
              >
                {bill.title}
              </h1>
              
              {/* Urgency Badge */}
              <Badge 
                variant="outline"
                className="chanuka-status-badge"
                style={{ 
                  backgroundColor: getUrgencyColor(bill.urgencyLevel),
                  color: 'white',
                  borderColor: getUrgencyColor(bill.urgencyLevel)
                }}
                aria-label={`Urgency level: ${bill.urgencyLevel}`}
              >
                {bill.urgencyLevel.toUpperCase()}
              </Badge>

              {/* Constitutional Flags */}
              {bill.constitutionalFlags.length > 0 && (
                <Badge 
                  variant="outline"
                  className="chanuka-status-badge"
                  style={{ 
                    backgroundColor: 'hsl(var(--civic-constitutional))',
                    color: 'white',
                    borderColor: 'hsl(var(--civic-constitutional))'
                  }}
                  aria-label={`${bill.constitutionalFlags.length} constitutional concerns`}
                >
                  ⚖️ {bill.constitutionalFlags.length} Constitutional Flag{bill.constitutionalFlags.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Bill Number and Status */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{bill.billNumber}</span>
              
              <Badge 
                variant="outline"
                style={{ 
                  backgroundColor: getStatusColor(bill.status),
                  color: 'white',
                  borderColor: getStatusColor(bill.status)
                }}
                aria-label={`Bill status: ${bill.status}`}
              >
                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
              </Badge>

              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <time dateTime={bill.introducedDate}>
                  Introduced {new Date(bill.introducedDate).toLocaleDateString()}
                </time>
              </span>

              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <time dateTime={bill.lastUpdated}>
                  Updated {new Date(bill.lastUpdated).toLocaleDateString()}
                </time>
              </span>

              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" aria-hidden="true" />
                {bill.sponsors.length} Sponsor{bill.sponsors.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Policy Areas */}
            <div className="flex flex-wrap gap-2 mb-4">
              {bill.policyAreas.map((area, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="text-xs"
                  style={{ color: 'hsl(var(--civic-community))' }}
                >
                  {area}
                </Badge>
              ))}
            </div>

            {/* Bill Summary */}
            <p className="text-muted-foreground leading-relaxed max-w-4xl">
              {bill.summary}
            </p>
          </div>
        </div>

        {/* Engagement Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-expert))' }}>
                {bill.viewCount.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Views</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bookmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-community))' }}>
                {bill.saveCount.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Saves</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-transparency))' }}>
                {bill.commentCount.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Share2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--civic-constitutional))' }}>
                {bill.shareCount.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Shares</div>
          </div>
        </div>
      </header>
    </>
  );
}