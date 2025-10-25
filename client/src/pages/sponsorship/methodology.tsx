
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { logger } from '../../utils/browser-logger';
import {
  ArrowLeft,
  Search, 
  CheckCircle,
  ChevronLeft,
  Shield,
  Database,
  FileText,
  Users,
  BarChart,
  Scale,
  Eye,
  Cpu,
  AlertTriangle
} from 'lucide-react';

interface MethodologyProps {
  billId?: string;
}

export default function MethodologyPage({ billId }: MethodologyProps) {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span>›</span>
        <Link to={`/bills/${billId}`} className="hover:text-primary">Bills</Link>
        <span>›</span>
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="hover:text-primary">Sponsorship Analysis</Link>
        <span>›</span>
        <span className="text-foreground">Methodology</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Analysis Navigation
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Intelligence & Methodology</h1>
        <p className="text-muted-foreground">Comprehensive analysis framework and data verification process</p>
      </div>

      {/* Methodology with Subtabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Our Comprehensive Analysis Framework</CardTitle>
          <p className="text-muted-foreground">Chanuka employs a systematic, multi-layered approach to analyze potential conflicts of interest and external influences on legislation</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="framework" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="framework" className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                Framework
              </TabsTrigger>
              <TabsTrigger value="collection" className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                Data Collection
              </TabsTrigger>
              <TabsTrigger value="verification" className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="assessment" className="flex items-center gap-1">
                <Scale className="h-4 w-4" />
                Risk Assessment
              </TabsTrigger>
              <TabsTrigger value="oversight" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Public Oversight
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-1">
                <Cpu className="h-4 w-4" />
                AI Analysis
              </TabsTrigger>
            </TabsList>

            {/* Analysis Framework Tab */}
            <TabsContent value="framework" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Five-Stage Analysis Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        stage: 1,
                        title: "Official Records Foundation",
                        description: "Systematic compilation of verifiable government data including financial disclosures, committee assignments, and voting histories.",
                        icon: <Database className="h-6 w-6" />
                      },
                      {
                        stage: 2,
                        title: "Financial Influence Mapping",
                        description: "Advanced tracking of campaign contributions and financial relationships across multiple election cycles.",
                        icon: <BarChart className="h-6 w-6" />
                      },
                      {
                        stage: 3,
                        title: "Content Origin Analysis",
                        description: "Natural language processing comparison of bill text with industry publications and lobbying materials.",
                        icon: <FileText className="h-6 w-6" />
                      },
                      {
                        stage: 4,
                        title: "Intelligence Integration",
                        description: "Incorporation of verified open source intelligence from credible media, academic research, and civil society investigations.",
                        icon: <Search className="h-6 w-6" />
                      },
                      {
                        stage: 5,
                        title: "Synthesis & Scoring",
                        description: "Proprietary algorithm combines all data points to generate nuanced conflict risk scores.",
                        icon: <Users className="h-6 w-6" />
                      }
                    ].map((step) => (
                      <Card key={step.stage}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                              {step.stage}
                            </div>
                            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg text-primary">
                              {step.icon}
                            </div>
                            <div>
                              <h5 className="font-semibold mb-2">{step.title}</h5>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Collection Tab */}
            <TabsContent value="collection" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Data Collection Infrastructure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Automated Public Records Scraper</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Systematically monitors financial disclosures, property records, business registrations, 
                          and other official government databases across federal, state, and local levels.
                        </p>
                        <div className="text-xs text-blue-600">
                          Coverage: 1.2M+ entities | Update frequency: Daily | Accuracy rate: 98.7%
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Corporate Relationship Graph Engine</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Maps complex corporate ownership structures, subsidiary relationships, 
                          and business partnerships to identify indirect financial connections.
                        </p>
                        <div className="text-xs text-blue-600">
                          Entities tracked: 1.2M+ companies | Relationship depth: 5 degrees | Jurisdictions: 34
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Media Intelligence Monitor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Natural language processing analysis of 300+ news outlets, trade publications, 
                          and investigative reports to identify emerging conflicts.
                        </p>
                        <div className="text-xs text-blue-600">
                          Sources monitored: 300+ outlets | Processing: Real-time | Languages: 12
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Information Verification & Weighting Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h5 className="font-semibold">Source Credibility Assessment</h5>
                    <div className="space-y-3">
                      {[
                        { source: "Documentary Evidence Support", weight: 95, color: "bg-green-500" },
                        { source: "Independent Verification Status", weight: 85, color: "bg-blue-500" },
                        { source: "Source Reputation Scoring", weight: 90, color: "bg-purple-500" },
                        { source: "Temporal Relevance", weight: 70, color: "bg-orange-500" }
                      ].map((item) => (
                        <div key={item.source} className="flex items-center gap-4">
                          <span className="min-w-[200px] text-sm font-medium">{item.source}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${item.color}`}
                              style={{ width: `${item.weight}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{item.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Risk Assessment Tab */}
            <TabsContent value="assessment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conflict Risk Assessment Dimensions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Financial Interest Analysis",
                        weight: "35%",
                        level: 80,
                        color: "bg-red-500",
                        description: "Measures scope and significance of direct or indirect financial benefits"
                      },
                      {
                        title: "Relational Proximity Assessment",
                        weight: "25%",
                        level: 60,
                        color: "bg-yellow-500",
                        description: "Evaluates closeness and nature of relationships between sponsors and benefiting entities"
                      },
                      {
                        title: "Disclosure Transparency",
                        weight: "20%",
                        level: 40,
                        color: "bg-blue-500",
                        description: "Assesses completeness and timeliness of official disclosures"
                      },
                      {
                        title: "Legislative Influence Scope",
                        weight: "20%",
                        level: 55,
                        color: "bg-green-500",
                        description: "Measures the sponsor's ability to shape specific clauses and amendments"
                      }
                    ].map((dimension) => (
                      <Card key={dimension.title}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-semibold">{dimension.title}</h6>
                            <span className="text-sm font-medium">Weight: {dimension.weight}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${dimension.color}`}
                                style={{ width: `${dimension.level}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{dimension.level}%</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{dimension.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Public Oversight Tab */}
            <TabsContent value="oversight" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Public Submission & Oversight Portal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-2">847</div>
                        <div className="text-sm text-muted-foreground">Submissions This Month</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">94.2%</div>
                        <div className="text-sm text-muted-foreground">Verification Rate</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600 mb-2">23</div>
                        <div className="text-sm text-muted-foreground">New Conflicts Identified</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h5 className="font-semibold mb-2">Our Verification Commitment</h5>
                      <p className="text-sm text-blue-800">
                        Every public submission receives response within 72 hours. Verified information is credited 
                        to contributors in our public database. Our expert verification network ensures accuracy 
                        while protecting legitimate whistleblowers and concerned citizens.
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Analysis Tab */}
            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Enhanced Pattern Detection & Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card className="border-blue-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Legislative Language Analysis</CardTitle>
                          <Badge className="bg-blue-100 text-blue-800">High Confidence: 87%</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Healthcare Reform Bill Section 12 demonstrates <strong>72% textual similarity</strong> with 
                          pharmaceutical industry white paper published in 2023.
                        </p>
                        <div className="text-xs text-blue-600">
                          Key Evidence: 247 matching phrases, 89 identical technical terms, 12 sequential paragraphs with {'>'}90% similarity
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Financial Pattern Correlation</CardTitle>
                          <Badge className="bg-green-100 text-green-800">Very High: 91%</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Digital learning provisions show <strong>68% precision alignment</strong> with vendor specifications. 
                          Concurrent analysis reveals timing correlation with campaign contributions.
                        </p>
                        <div className="text-xs text-green-600">
                          Financial Trail: 7 related entities, $45,000 total contributions, 60-day correlation window
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Behavioral Anomaly Detection</CardTitle>
                          <Badge className="bg-red-100 text-red-800">Critical Alert: 94%</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Donation volumes increased by <strong>340%</strong> in 30-day period preceding policy position reversal. 
                          Pattern repeats across three separate legislative initiatives.
                        </p>
                        <div className="text-xs text-red-600">
                          Pattern Details: 3 legislative initiatives, 340% contribution spike, 97% probability of non-random occurrence
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Limitations & Disclaimers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Limitations & Disclaimers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Data Completeness:</strong> Our analysis is based on publicly available information. 
              Some financial relationships or conflicts may not be captured if not publicly disclosed.
            </p>
            <p>
              <strong>Temporal Accuracy:</strong> Financial interests and affiliations change over time. 
              We strive to maintain current data but there may be delays in updates.
            </p>
            <p>
              <strong>Interpretation:</strong> Conflict scores represent potential risks based on available data. 
              They do not constitute accusations of wrongdoing or improper behavior.
            </p>
            <p>
              <strong>Legal Compliance:</strong> Our analysis aims to highlight transparency issues, 
              not determine legal compliance. Legal determinations require official investigation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link to={`/bills/${billId}/sponsorship-analysis/financial-network`}>
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous: Financial Network
          </Button>
        </Link>
        <Link to={`/bills/${billId}/sponsorship-analysis`}>
          <Button>
            Return to Navigation
          </Button>
        </Link>
      </div>
    </div>
  );
}
