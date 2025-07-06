import React from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, User, Network, Search, FileText } from 'lucide-react';

// Import the new page components
import SponsorshipOverview from './sponsorship/overview';
import PrimarySponsorAnalysis from './sponsorship/primary-sponsor';
import CoSponsorsAnalysis from './sponsorship/co-sponsors';
import FinancialNetworkAnalysis from './sponsorship/financial-network';
import MethodologyPage from './sponsorship/methodology';

// Navigation configuration for better maintainability
const navigationCards = [
  {
    path: 'overview',
    title: 'Quick Overview',
    subtitle: 'Key insights & summary',
    description: 'Essential insights and key transparency concerns at a glance. Perfect starting point for understanding the bill\'s sponsorship dynamics.',
    icon: FileText,
    color: 'blue',
    readTime: '2-3 min read'
  },
  {
    path: 'primary-sponsor',
    title: 'Primary Sponsor',
    subtitle: 'Detailed conflict analysis',
    description: 'Comprehensive analysis of the primary sponsor\'s financial interests, voting patterns, and potential conflicts of interest.',
    icon: User,
    color: 'green',
    readTime: '5-8 min read'
  },
  {
    path: 'co-sponsors',
    title: 'Co-Sponsors',
    subtitle: 'Multiple sponsor profiles',
    description: 'Individual analysis of all co-sponsors, their affiliations, and collective influence patterns on the legislation.',
    icon: Users,
    color: 'yellow',
    readTime: '5-8 min read'
  },
  {
    path: 'financial-network',
    title: 'Financial Network',
    subtitle: 'Comprehensive mapping',
    description: 'Advanced network analysis of financial relationships, industry connections, and influence pathways across all sponsors.',
    icon: Network,
    color: 'purple',
    readTime: '10+ min read'
  },
  {
    path: 'methodology',
    title: 'Methodology',
    subtitle: 'Analysis framework',
    description: 'Detailed explanation of our analysis methods, data sources, verification processes, and transparency commitments.',
    icon: Search,
    color: 'gray',
    readTime: '10+ min read'
  }
];

// Color mapping for consistent styling
const colorStyles = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600' }
};

// Recommended reading sequence for better user guidance
const readingSequence = [
  { path: 'overview', label: '1. Overview' },
  { path: 'primary-sponsor', label: '2. Primary Sponsor' },
  { path: 'co-sponsors', label: '3. Co-Sponsors' },
  { path: 'financial-network', label: '4. Financial Network' }
];

export default function BillSponsorshipAnalysis() {
  const { billId } = useParams<{ billId: string }>();
  const [location] = useLocation();

  // Extract the current tab from the URL with improved logic
  const pathSegments = location.split('/');
  const currentPath = pathSegments[pathSegments.length - 1];
  const validSubPages = navigationCards.map(card => card.path);
  const isSubPage = validSubPages.includes(currentPath || '');

  // Render appropriate subpage component with error handling
  if (isSubPage) {
    const renderSubPage = () => {
      switch (currentPath) {
        case 'overview':
          return <SponsorshipOverview billId={billId} />;
        case 'primary-sponsor':
          return <PrimarySponsorAnalysis billId={billId} />;
        case 'co-sponsors':
          return <CoSponsorsAnalysis billId={billId} />;
        case 'financial-network':
          return <FinancialNetworkAnalysis billId={billId} />;
        case 'methodology':
          return <MethodologyPage billId={billId} />;
        default:
          // Fallback to overview if path is somehow invalid
          return <SponsorshipOverview billId={billId} />;
      }
    };

    return renderSubPage();
  }

  // Render navigation card component for better reusability
  const NavigationCard = ({ card, billId }) => {
    const IconComponent = card.icon;
    const colorStyle = colorStyles[card.color];

    return (
      <Link to={`/bills/${billId}/sponsorship-analysis/${card.path}`}>
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${colorStyle.bg} rounded-lg`}>
                <IconComponent className={`h-6 w-6 ${colorStyle.text}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg leading-tight">{card.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{card.subtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {card.description}
            </p>
            <div className={`text-xs ${colorStyle.text} font-medium`}>
              ⏱️ {card.readTime}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Main navigation page
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Enhanced breadcrumb navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/bills/${billId}`} className="hover:text-primary transition-colors">Bills</Link>
        <span aria-hidden="true">›</span>
        <span className="text-foreground font-medium">Bill Sponsorship Analysis</span>
      </nav>

      {/* Enhanced header section */}
      <header className="mb-8">
        <Link 
          to={`/bills/${billId}`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Bill Overview
        </Link>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Bill Sponsorship Transparency
            </h1>
            <p className="text-lg text-muted-foreground max-w-4xl leading-relaxed">
              This analysis provides detailed insights into bill sponsors and their potential conflicts of interest, 
              combining official records, financial disclosures, and verified public information to ensure transparency 
              in legislative processes.
            </p>
          </div>
        </div>
      </header>

      {/* Enhanced navigation cards grid */}
      <section className="mb-8" aria-labelledby="analysis-sections">
        <h2 id="analysis-sections" className="sr-only">Analysis Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card, index) => (
            <NavigationCard 
              key={card.path} 
              card={card} 
              billId={billId}
            />
          ))}
        </div>
      </section>

      {/* Enhanced recommended reading path */}
      <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Recommended Reading Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            For the most comprehensive understanding of the sponsorship analysis, we recommend following this sequence. 
            Each section builds upon the previous one to provide you with a complete picture of potential conflicts and influences.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {readingSequence.map((step, index) => (
              <React.Fragment key={step.path}>
                <Link to={`/bills/${billId}/sponsorship-analysis/${step.path}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {step.label}
                  </Button>
                </Link>
                {index < readingSequence.length - 1 && (
                  <span className="text-muted-foreground text-sm" aria-hidden="true">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            Total estimated reading time: 25-35 minutes for complete analysis
          </p>
        </CardContent>
      </Card>
    </div>
  );
}