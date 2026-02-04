import { BookOpen, Scale, Clock, Zap, Users, HelpCircle, ExternalLink } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { Button } from '@client/lib/design-system/interactive/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system/interactive/Tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system/typography/Card';
import type { Bill } from '@client/lib/types';

import { ConstitutionalContext } from './ConstitutionalContext';
import { EducationalTooltip } from './EducationalTooltip';
import { HistoricalPrecedents } from './HistoricalPrecedents';
import { PlainLanguageSummary } from './PlainLanguageSummary';
import { ProcessEducation } from './ProcessEducation';

interface EducationalFrameworkProps {
  bill: Bill;
  className?: string;
}

/**
 * EducationalFramework - Comprehensive educational context for bills
 * Features: Plain language summaries, constitutional context, historical precedents, process education
 */
import {
  REAL_BILLS,
  KENYA_CONSTITUTION,
  KENYA_CASE_LAW,
} from '@client/lib/data/mock/real-kenya-data';

// ... (component definition)

export function EducationalFramework({ bill, className = '' }: EducationalFrameworkProps) {
  const [activeTab, setActiveTab] = useState('plain-language');

  // Use real bill data
  const digitalHealthBill = REAL_BILLS[0];
  const financeBill = REAL_BILLS[1];
  const art43 = KENYA_CONSTITUTION.articles[43];
  
  // Real cases
  const healthCase = KENYA_CASE_LAW.health[0];
  const ipCase = KENYA_CASE_LAW.health[2];

  // Mock data for demonstration - using REAL Kenyan Bill Content
  const mockPlainLanguageSections = [
    {
      id: 'section-1',
      title: digitalHealthBill.title,
      legalText: digitalHealthBill.summary,
      plainLanguage:
        'The government is creating a new digital system to manage health records and services. This will help hospitals share information securely and improve how patients get care.',
      keyPoints: digitalHealthBill.keyProvisions,
      impact: {
        who: ['Patients', 'Healthcare Providers', 'Insurance Companies'],
        what: [
          'Electronic health records for all',
          'Better data privacy protections',
          'Faster access to medical history',
          'Improved telemedicine services',
        ],
        when: 'Implementation starts upon assent, with 3-year rollout',
        cost: 'Estimated KSh 5 billion for infrastructure setup',
      },
      complexity: 'medium' as const,
      importance: 'high' as const,
    },
    {
      id: 'section-2',
      title: financeBill.title,
      legalText: financeBill.summary,
      plainLanguage:
        'This annual law sets out how the government will raise money through taxes. It proposes changes to income tax, VAT, and other duties to fund the national budget.',
      keyPoints: financeBill.keyProvisions,
      impact: {
        who: ['Taxpayers', 'Businesses', 'Importers'],
        what: [
          'Changes to tax rates',
          'New levies on eco-unfriendly products',
          'Adjustments to deductibles',
        ],
        when: 'Effective July 1st, 2024',
        cost: 'Aims to raise KSh 300 billion in additional revenue',
      },
      complexity: 'high' as const,
      importance: 'critical' as const,
    },
  ];

  const mockConstitutionalProvisions = [
    {
      id: 'provision-1',
      sectionNumber: '4',
      title: 'Right to Health',
      summary: 'Ensures digital health interventions align with the constitutional guarantee of highest attainable standard of health.',
      constitutionalBasis: [
        {
          id: 'cb-1',
          article: `Article ${art43.number}`,
          section: '1(a)',
          title: art43.title,
          text: art43.content,
          relevance: 'direct' as const,
          impact: 'supports' as const,
          explanation:
            'This provision mandates the state to use progressive technologies to ensure the delivery of quality healthcare services to all Citizens.',
        },
        {
          id: 'cb-2',
          article: 'Article 31',
          section: 'c',
          title: 'Privacy',
          text: 'Every person has the right to privacy, which includes the right not to have information relating to their family or private affairs unnecessarily required or revealed.',
          relevance: 'contextual' as const,
          impact: 'mixed' as const,
          explanation:
            "Digital health systems must balance accessibility with the strict privacy protections guaranteed by the Constitution.",
        },
      ],
      concerns: [
        'Data sovereignty and storage of sensitive health info',
        'Equitable access for those without digital devices (digital divide)',
      ],
      precedents: [
        `${healthCase.name} ${healthCase.citation} - ${healthCase.summary}`,
        `${ipCase.name} ${ipCase.citation} - ${ipCase.summary}`,
      ],
    },
  ];

  const mockHistoricalPrecedents = [
    {
      id: 'precedent-1',
      title: 'Universal Health Coverage (UHC) Pilot',
      year: 2018,
      jurisdiction: 'Kenya',
      status: 'implemented' as const,
      similarity: 'high' as const,
      keyProvisions: [
        'Removal of user fees in public hospitals',
        'Focus on primary healthcare',
        'Pilot in 4 counties (Kisumu, Nyeri, Isiolo, Machakos)',
      ],
      outcome: {
        result: 'mixed' as const,
        impact:
          'Increased utilization of services by 40%, but faced challenges with drug stockouts and staff shortages.',
        lessons: [
          'Input financing must match demand financing',
          'Community health volunteers are critical for success',
          'Digital systems were fragmented and hampered reporting',
        ],
        challenges: [
          'Budgetary constraints',
          'Intergovernmental coordination issues',
          'Weak supply chain management',
        ],
      },
      constitutionalChallenges: {
        filed: false,
        outcome: 'n/a' as const,
        details:
          'No direct challenge, but questions raised about equity between pilot and non-pilot counties.',
      },
      publicSupport: {
        initial: 85,
        final: 60,
        keyFactors: [
          'Free services were popular',
          'Drug shortages caused frustration',
          'Long waiting times reduced satisfaction',
        ],
      },
      timeline: {
        introduced: '2018-06-01',
        passed: '2018-12-12',
        implemented: '2019-01-01',
        challenged: 'N/A',
      },
    },
  ];

  const mockLegislativeSteps = [
    {
      id: 'first-reading',
      title: 'First Reading',
      description: 'Bill is introduced and its title is read in Parliament',
      duration: '1-2 days',
      status: 'completed' as const,
      participants: ['Bill Sponsor', 'Parliamentary Clerk', 'Speaker'],
      keyActions: [
        'Bill title is read aloud',
        'Bill is officially introduced to Parliament',
        'Copies are distributed to all members',
      ],
      publicParticipation: {
        allowed: false,
        methods: [],
      },
      requirements: [
        'Bill must be properly formatted',
        'Sponsor must be present',
        'Quorum must be met',
      ],
      outcomes: ['Bill proceeds to Second Reading', 'Bill may be withdrawn by sponsor'],
    },
    {
      id: 'second-reading',
      title: 'Second Reading',
      description: 'General debate on the principles and merits of the bill',
      duration: '2-4 weeks',
      status: 'current' as const,
      participants: ['All MPs', 'Bill Sponsor', 'Opposition Members'],
      keyActions: [
        'General debate on bill principles',
        'Members express support or opposition',
        'Vote on whether to proceed to committee stage',
      ],
      publicParticipation: {
        allowed: true,
        methods: [
          'Submit written comments to Parliament',
          'Attend public gallery during debates',
          'Contact your MP with concerns',
        ],
        deadline: '2024-02-15',
      },
      requirements: [
        'Majority vote to proceed',
        'Adequate debate time for all parties',
        'Proper notice given to all members',
      ],
      outcomes: [
        'Bill proceeds to Committee Stage',
        'Bill is rejected and dies',
        'Bill is referred back for amendments',
      ],
    },
  ];

  const mockCommittees = [
    {
      id: 'health-committee',
      name: 'Health Committee',
      role: 'Reviews all health-related legislation and policy',
      members: 15,
      chairperson: 'Hon. Dr. Sarah Wanjiku',
      nextMeeting: '2024-02-10',
      contact: {
        email: 'health.committee@parliament.go.ke',
        phone: '+254-20-221-291',
        office: 'Parliament Buildings, Committee Room 5',
      },
    },
  ];

  const mockTimeline = {
    introduced: '2024-01-10',
    estimatedCompletion: '2024-06-30',
    keyDeadlines: [
      { date: '2024-02-15', event: 'Public comment period ends' },
      { date: '2024-03-01', event: 'Committee stage begins' },
      { date: '2024-04-15', event: 'Committee report due' },
      { date: '2024-05-30', event: 'Third reading scheduled' },
    ],
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Educational Framework Header */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            Educational Framework
          </CardTitle>
          <CardDescription>
            Comprehensive educational resources to help you understand this legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-emerald-50">
              <BookOpen className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <div className="text-sm font-medium">Plain Language</div>
              <div className="text-xs text-muted-foreground">Clear explanations</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50">
              <Scale className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <div className="text-sm font-medium">Constitutional</div>
              <div className="text-xs text-muted-foreground">Legal context</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50">
              <Clock className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <div className="text-sm font-medium">Historical</div>
              <div className="text-xs text-muted-foreground">Past outcomes</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50">
              <Scale className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <div className="text-sm font-medium">Process</div>
              <div className="text-xs text-muted-foreground">How it works</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="plain-language" className="text-xs lg:text-sm">
            <BookOpen className="h-4 w-4 mr-1 lg:mr-2" />
            Plain Language
          </TabsTrigger>
          <TabsTrigger value="constitutional" className="text-xs lg:text-sm">
            <Scale className="h-4 w-4 mr-1 lg:mr-2" />
            Constitutional
          </TabsTrigger>
          <TabsTrigger value="historical" className="text-xs lg:text-sm">
            <Clock className="h-4 w-4 mr-1 lg:mr-2" />
            Historical
          </TabsTrigger>
          <TabsTrigger value="process" className="text-xs lg:text-sm">
            <Scale className="h-4 w-4 mr-1 lg:mr-2" />
            Process
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plain-language" className="space-y-6">
          <PlainLanguageSummary
            billId={bill.id.toString()}
            billTitle={bill.title}
            sections={mockPlainLanguageSections}
          />
        </TabsContent>

        <TabsContent value="constitutional" className="space-y-6">
          <ConstitutionalContext
            billId={bill.id.toString()}
            billTitle={bill.title}
            provisions={mockConstitutionalProvisions}
          />
        </TabsContent>

        <TabsContent value="historical" className="space-y-6">
          <HistoricalPrecedents
            billId={bill.id.toString()}
            billTitle={bill.title}
            precedents={mockHistoricalPrecedents}
          />
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <ProcessEducation
            billId={bill.id.toString()}
            billTitle={bill.title}
            currentStep="second-reading"
            steps={mockLegislativeSteps}
            committees={mockCommittees}
            timeline={mockTimeline}
          />
        </TabsContent>
      </Tabs>

      {/* Educational Tooltips Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Interactive Help
          </CardTitle>
          <CardDescription>
            Hover over highlighted terms throughout the interface for instant explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              This bill involves several important concepts including{' '}
              <EducationalTooltip
                term="Constitutional Review"
                definition="The process of examining whether laws comply with the constitution"
                context="constitutional"
                examples={[
                  'Judicial review of new legislation',
                  'Court challenges to government policies',
                ]}
                relatedTerms={['Judicial Review', 'Constitutional Court']}
              >
                <span className="text-blue-600 underline decoration-dotted">
                  constitutional review
                </span>
              </EducationalTooltip>{' '}
              and{' '}
              <EducationalTooltip
                term="Legislative Process"
                definition="The formal procedure by which bills become laws"
                context="procedural"
                examples={['First, second, and third readings', 'Committee stage review']}
                relatedTerms={['Parliamentary Procedure', 'Bill Reading']}
              >
                <span className="text-blue-600 underline decoration-dotted">
                  legislative procedures
                </span>
              </EducationalTooltip>
              . Understanding these concepts is essential for{' '}
              <EducationalTooltip
                term="Civic Engagement"
                definition="Active participation in the life of a community to improve conditions for others"
                context="civic"
                examples={[
                  'Voting in elections',
                  'Contacting representatives',
                  'Public consultations',
                ]}
                relatedTerms={['Democratic Participation', 'Public Consultation']}
              >
                <span className="text-blue-600 underline decoration-dotted">
                  effective civic engagement
                </span>
              </EducationalTooltip>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Learning Actions</CardTitle>
          <CardDescription>Jump to specific educational resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Glossary</div>
                  <div className="text-xs opacity-80">Legal and civic terms</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Ask Experts</div>
                  <div className="text-xs opacity-80">Get professional insights</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">External Resources</div>
                  <div className="text-xs opacity-80">Additional learning materials</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
