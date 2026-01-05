import {
import React from 'react';

  BookOpen,
  Scale,
  Clock,
  Zap,
  Users,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/design-system/interactive/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/design-system/interactive/Tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';
import type { Bill } from '@/shared/types';

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
export function EducationalFramework({ bill, className = "" }: EducationalFrameworkProps) {
  const [activeTab, setActiveTab] = useState('plain-language');

  // Mock data for demonstration - in real implementation, this would come from the backend
  const mockPlainLanguageSections = [
    {
      id: 'section-1',
      title: 'Healthcare Coverage Expansion',
      legalText: 'Section 3(a): The Secretary shall establish a comprehensive healthcare coverage program that provides essential health benefits to all eligible individuals as defined in subsection (b), subject to the availability of appropriated funds and in accordance with the implementation timeline specified in Section 7.',
      plainLanguage: 'The government will create a new healthcare program that covers basic medical services for people who qualify. The program will start based on the schedule in Section 7, but only if Congress provides the money for it.',
      keyPoints: [
        'Creates a new government healthcare program',
        'Covers essential medical services like doctor visits and prescriptions',
        'Only available to people who meet certain requirements',
        'Depends on Congress approving funding'
      ],
      impact: {
        who: ['Uninsured adults', 'Low-income families', 'Small business employees'],
        what: [
          'Access to preventive care',
          'Prescription drug coverage',
          'Emergency medical services',
          'Mental health support'
        ],
        when: 'Implementation begins January 2025, full rollout by 2027',
        cost: 'Estimated $50 billion over 5 years, funded through new healthcare tax'
      },
      complexity: 'medium' as const,
      importance: 'high' as const
    },
    {
      id: 'section-2',
      title: 'Funding Mechanism',
      legalText: 'Section 5(c): To finance the program established under Section 3, there is hereby imposed a tax equal to 2.5 percent of the adjusted gross income of individuals whose adjusted gross income exceeds $400,000 for the taxable year, with such tax to be collected in the same manner as other federal income taxes.',
      plainLanguage: 'To pay for this healthcare program, people who earn more than $400,000 per year will pay an extra 2.5% tax on their income. This tax will be collected the same way as regular income taxes.',
      keyPoints: [
        'New 2.5% tax on high earners',
        'Only affects people making over $400,000/year',
        'Collected through existing tax system',
        'Revenue goes directly to healthcare program'
      ],
      impact: {
        who: ['High-income individuals', 'Wealthy families', 'Some small business owners'],
        what: [
          'Additional tax burden of 2.5%',
          'Increased tax compliance requirements',
          'Potential impact on investment decisions'
        ],
        when: 'Tax begins January 1, 2025',
        cost: 'Average $10,000-25,000 additional tax for affected individuals'
      },
      complexity: 'low' as const,
      importance: 'critical' as const
    }
  ];

  const mockConstitutionalProvisions = [
    {
      id: 'provision-1',
      sectionNumber: '3',
      title: 'Healthcare Coverage Expansion',
      summary: 'Establishes comprehensive healthcare coverage program for eligible individuals',
      constitutionalBasis: [
        {
          id: 'cb-1',
          article: 'Article 43',
          section: '1',
          title: 'Right to Health',
          text: 'Every person has the right to the highest attainable standard of health, which includes the right to health care services, including reproductive health care.',
          relevance: 'direct' as const,
          impact: 'supports' as const,
          explanation: 'This provision directly supports the constitutional right to healthcare by expanding access to essential health services for underserved populations.'
        },
        {
          id: 'cb-2',
          article: 'Article 21',
          section: '1',
          title: 'Fundamental Rights and Freedoms',
          text: 'We, the people of Kenya, acknowledge the supremacy of the Almighty God of all creation and honour those who heroically struggled to bring freedom and justice to our land.',
          relevance: 'contextual' as const,
          impact: 'supports' as const,
          explanation: 'The preamble\'s commitment to justice aligns with ensuring equitable healthcare access for all citizens.'
        }
      ],
      concerns: [
        'Funding mechanism may face constitutional challenges regarding tax equity',
        'Implementation timeline may conflict with devolved healthcare responsibilities'
      ],
      precedents: [
        'Okwanda v. Minister of Health [2014] eKLR - Right to healthcare access',
        'Patricia Asero Ochieng & 2 others v. Attorney General [2012] eKLR - Healthcare funding obligations'
      ]
    }
  ];

  const mockHistoricalPrecedents = [
    {
      id: 'precedent-1',
      title: 'Universal Health Coverage Act 2018',
      year: 2018,
      jurisdiction: 'Kenya',
      status: 'passed' as const,
      similarity: 'high' as const,
      keyProvisions: [
        'Established National Health Insurance Fund expansion',
        'Created universal healthcare coverage framework',
        'Introduced healthcare financing mechanisms'
      ],
      outcome: {
        result: 'mixed' as const,
        impact: 'Expanded healthcare access to 2.5 million additional Kenyans, but faced implementation challenges due to insufficient funding and administrative capacity.',
        lessons: [
          'Strong political support is essential for successful implementation',
          'Adequate funding mechanisms must be established before rollout',
          'Stakeholder engagement improves public acceptance'
        ],
        challenges: [
          'Insufficient initial funding led to service delivery gaps',
          'Administrative systems were not ready for scale',
          'Resistance from private healthcare providers'
        ]
      },
      constitutionalChallenges: {
        filed: true,
        outcome: 'upheld' as const,
        details: 'High Court upheld the Act, ruling that universal healthcare access aligns with constitutional rights under Article 43.'
      },
      publicSupport: {
        initial: 72,
        final: 58,
        keyFactors: [
          'Initial enthusiasm for universal coverage',
          'Concerns about tax increases',
          'Implementation delays reduced confidence'
        ]
      },
      timeline: {
        introduced: '2018-03-15',
        passed: '2018-07-20',
        implemented: '2019-01-01',
        challenged: '2018-09-10'
      }
    }
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
        'Copies are distributed to all members'
      ],
      publicParticipation: {
        allowed: false,
        methods: []
      },
      requirements: [
        'Bill must be properly formatted',
        'Sponsor must be present',
        'Quorum must be met'
      ],
      outcomes: [
        'Bill proceeds to Second Reading',
        'Bill may be withdrawn by sponsor'
      ]
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
        'Vote on whether to proceed to committee stage'
      ],
      publicParticipation: {
        allowed: true,
        methods: [
          'Submit written comments to Parliament',
          'Attend public gallery during debates',
          'Contact your MP with concerns'
        ],
        deadline: '2024-02-15'
      },
      requirements: [
        'Majority vote to proceed',
        'Adequate debate time for all parties',
        'Proper notice given to all members'
      ],
      outcomes: [
        'Bill proceeds to Committee Stage',
        'Bill is rejected and dies',
        'Bill is referred back for amendments'
      ]
    }
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
        office: 'Parliament Buildings, Committee Room 5'
      }
    }
  ];

  const mockTimeline = {
    introduced: '2024-01-10',
    estimatedCompletion: '2024-06-30',
    keyDeadlines: [
      { date: '2024-02-15', event: 'Public comment period ends' },
      { date: '2024-03-01', event: 'Committee stage begins' },
      { date: '2024-04-15', event: 'Committee report due' },
      { date: '2024-05-30', event: 'Third reading scheduled' }
    ]
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
                examples={["Judicial review of new legislation", "Court challenges to government policies"]}
                relatedTerms={["Judicial Review", "Constitutional Court"]}
              >
                <span className="text-blue-600 underline decoration-dotted">constitutional review</span>
              </EducationalTooltip>
              {' '}and{' '}
              <EducationalTooltip
                term="Legislative Process"
                definition="The formal procedure by which bills become laws"
                context="procedural"
                examples={["First, second, and third readings", "Committee stage review"]}
                relatedTerms={["Parliamentary Procedure", "Bill Reading"]}
              >
                <span className="text-blue-600 underline decoration-dotted">legislative procedures</span>
              </EducationalTooltip>
              . Understanding these concepts is essential for{' '}
              <EducationalTooltip
                term="Civic Engagement"
                definition="Active participation in the life of a community to improve conditions for others"
                context="civic"
                examples={["Voting in elections", "Contacting representatives", "Public consultations"]}
                relatedTerms={["Democratic Participation", "Public Consultation"]}
              >
                <span className="text-blue-600 underline decoration-dotted">effective civic engagement</span>
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
          <CardDescription>
            Jump to specific educational resources
          </CardDescription>
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
