import { AlertTriangle, Eye, CheckCircle, X, Clock, FileText, Users, Calendar, ArrowLeft, Shield, Building, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@client/components/ui/alert';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@client/components/ui/dialog';
import { Textarea } from '@client/components/ui/textarea';
import { logger } from '@client/utils/logger';

// Enhanced interface to support multiple workaround types in Kenyan context
interface ImplementationWorkaround {
  id: string;
  originalBillId: string;
  workaroundBillId: string;
  originalBillTitle: string;
  workaroundBillTitle: string;
  detectionReason: string;
  similarityScore: number;

  // Enhanced workaround type classification for Kenyan context
  workaroundType: 'legislative_repackaging' | 'executive_directive' | 'regulatory_implementation' | 'budget_allocation' | 'emergency_powers' | 'administrative_circular' | 'judicial_interpretation' | 'county_bypass' | 'multi_ministry_coordination' | 'statutory_instrument';

  // Enhanced bypass mechanism details for Kenyan governance
  bypassMechanism: {
    primaryTactic: string;
    institutionalLevel: 'national' | 'county' | 'sub_county' | 'multi_level';
    branchOfGovernment: 'legislature' | 'executive' | 'judiciary' | 'multi_branch';
    timingStrategy: 'immediate' | 'delayed' | 'phased' | 'conditional';
    scopeReduction: boolean; // Whether scope was narrowed to avoid opposition
    languageObfuscation: boolean; // Whether technical language was used to obscure intent
    proceduralWorkaround: boolean; // Whether normal procedures were bypassed
  };

  similarityAnalysis: {
    textSimilarity: number;
    structuralSimilarity: number;
    intentSimilarity: number;
    keyDifferences: string[];
    commonElements: string[];

    // New analysis dimensions for executive and administrative tactics
    policyObjectiveSimilarity: number;
    implementationPathSimilarity: number;
    stakeholderImpactSimilarity: number;
    enforcementMechanismSimilarity: number;
  };

  verification_status: 'pending' | 'verified' | 'rejected';
  alertStatus: 'active' | 'resolved' | 'dismissed';
  publicNotificationSent: boolean;

  // Enhanced evidence tracking for Kenyan context
  evidenceDocuments: Array<{
    type: 'parliamentary_hansard' | 'executive_directive' | 'regulatory_notice' | 'budget_document' | 'administrative_circular' | 'court_ruling' | 'ministry_guidance' | 'gazette_notice' | 'statutory_instrument';
    url: string;
    description: string;
    dateIssued: string;
    issuingAuthority: string;
  }>;

  // Enhanced tracking of circumvention patterns in Kenyan context
  circumventionPattern: {
    previousRejectionDetails: {
      rejectionType: 'parliamentary_defeat' | 'public_opposition' | 'constitutional_challenge' | 'regulatory_review' | 'presidential_assent_delay' | 'high_court_ruling' | 'senate_rejection';
      rejectionDate: string;
      rejectionReason: string;
      oppositionSources: string[];
    };

    workaroundStrategy: {
      authorityUsed: string; // Which executive authority, ministry power, etc.
      justificationProvided: string;
      publicParticipationBypassed: boolean;
      parliamentaryOversightBypassed: boolean;
      constitutionalConcerns: string[];
    };
  };

  communityConfirmations: number;
  reportedBy: {
    id: string;
    name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

interface ImplementationWorkaroundsProps { bill_id: string;
 }

export function ImplementationWorkarounds({ bill_id  }: ImplementationWorkaroundsProps) {
  const [workarounds, setWorkarounds] = useState<ImplementationWorkaround[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkaround, setSelectedWorkaround] = useState<ImplementationWorkaround | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    fetchWorkarounds();
  }, [bill_id]);

  const fetchWorkarounds = async () => { try {
      const response = await fetch(`/api/bills/${bill_id }/implementation-workarounds`);
      if (response.ok) {
        const data = await response.json();
        setWorkarounds(data);
      }
    } catch (error) {
      logger.error('Error fetching implementation workarounds:', { component: 'Chanuka' }, error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWorkaround = async (workaroundId: string) => {
    try {
      const response = await fetch(`/api/implementation-workarounds/${workaroundId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchWorkarounds(); // Refresh data
      }
    } catch (error) {
      logger.error('Error confirming workaround:', { component: 'Chanuka' }, error);
    }
  };

  const handleReportNewWorkaround = async () => {
    try {
      const response = await fetch('/api/implementation-workarounds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bill_id,
          detectionReason: reportReason,
         }),
      });

      if (response.ok) {
        setReportDialogOpen(false);
        setReportReason('');
        fetchWorkarounds(); // Refresh data
      }
    } catch (error) {
      logger.error('Error reporting workaround:', { component: 'Chanuka' }, error);
    }
  };

  // Enhanced helper functions for Kenyan workaround types
  const getWorkaroundTypeIcon = (type: string) => {
    switch (type) {
      case 'executive_directive': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'regulatory_implementation': return <Building className="w-4 h-4 text-purple-600" />;
      case 'judicial_interpretation': return <Settings className="w-4 h-4 text-gray-700" />;
      case 'budget_allocation': return <FileText className="w-4 h-4 text-green-600" />;
      case 'emergency_powers': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'statutory_instrument': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getWorkaroundTypeLabel = (type: string) => {
    const labels = {
      'legislative_repackaging': 'Legislative Repackaging',
      'executive_directive': 'Executive Directive',
      'regulatory_implementation': 'Regulatory Implementation',
      'budget_allocation': 'Budget Allocation',
      'emergency_powers': 'Emergency Powers',
      'administrative_circular': 'Administrative Circular',
      'judicial_interpretation': 'Judicial Interpretation',
      'county_bypass': 'County Government Bypass',
      'multi_ministry_coordination': 'Multi-Ministry Coordination',
      'statutory_instrument': 'Statutory Instrument'
    };
    return labels[type as keyof typeof labels] || 'Unknown Type';
  };

  const getBranchIcon = (branch: string) => {
    switch (branch) {
      case 'executive': return <Shield className="w-3 h-3" />;
      case 'judiciary': return <Settings className="w-3 h-3" />;
      case 'multi_branch': return <Building className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <X className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-red-100 text-red-800 border-red-200';
      case 'rejected': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold';
    if (score >= 60) return 'text-orange-600 font-semibold';
    return 'text-yellow-600';
  };

  // Enhanced function to describe bypass mechanisms in Kenyan context
  const getBypassDescription = (workaround: ImplementationWorkaround) => {
    const { bypassMechanism, workaroundType } = workaround;

    let description = '';

    switch (workaroundType) {
      case 'executive_directive':
        description = `Used presidential or ministerial executive authority to implement policy objectives that were previously rejected through normal parliamentary channels.`;
        break;
      case 'regulatory_implementation':
        description = `Implemented through ministry regulations and administrative processes, bypassing direct parliamentary approval and public participation requirements.`;
        break;
      case 'budget_allocation':
        description = `Implemented through budget allocations and supplementary estimates, making it difficult to oppose without affecting essential government operations.`;
        break;
      case 'emergency_powers':
        description = `Justified under emergency provisions or Article 132 of the Constitution, potentially circumventing normal legislative and public participation processes.`;
        break;
      case 'statutory_instrument':
        description = `Implemented through statutory instruments and subsidiary legislation, avoiding full parliamentary debate and public scrutiny.`;
        break;
      case 'county_bypass':
        description = `Implemented by bypassing county government structures and devolved functions, potentially violating principles of devolution.`;
        break;
      default:
        description = bypassMechanism.primaryTactic;
    }

    if (bypassMechanism.proceduralWorkaround) {
      description += ` Normal procedural safeguards under the Constitution and Standing Orders were bypassed.`;
    }

    if (bypassMechanism.languageObfuscation) {
      description += ` Technical or legal language may have been used to reduce public understanding and minimize opposition.`;
    }

    return description;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Analyzing for implementation workarounds and constitutional bypass tactics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Implementation Workaround Analysis</h3>
        </div>

        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Report Workaround
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Implementation Workaround</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Describe the potential workaround or bypass tactic:</label>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Explain similarities to previous rejected legislation, executive directives that bypass parliamentary intent, regulatory implementations that circumvent public participation, budget allocations, emergency authority usage, statutory instruments, or other constitutional bypass mechanisms..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReportNewWorkaround} disabled={!reportReason.trim()}>
                  Submit Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {workarounds.length === 0 ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>No implementation workarounds detected.</strong> This bill appears to be original legislation that has not been repackaged or implemented through alternative channels to bypass parliamentary rejection, public participation requirements, or normal constitutional processes.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Implementation workarounds detected.</strong> This bill or similar policy objectives appear to have been pursued through alternative implementation paths after facing rejection through normal parliamentary processes. This may include executive directives, regulatory implementations, budget allocations, emergency powers, statutory instruments, or other constitutional bypass mechanisms.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {workarounds.map((workaround) => (
              <Card key={workaround.id} className={`border-2 ${getStatusColor(workaround.verification_status)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(workaround.verification_status)}
                      Implementation Workaround Alert
                      {workaround.publicNotificationSent && (
                        <Badge variant="secondary" className="ml-2">
                          <Eye className="w-3 h-3 mr-1" />
                          Public Alert Sent
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                        {getWorkaroundTypeIcon(workaround.workaroundType)}
                        {getWorkaroundTypeLabel(workaround.workaroundType)}
                      </Badge>
                      <Badge className={getStatusColor(workaround.verification_status)}>
                        {workaround.verification_status.charAt(0).toUpperCase() + workaround.verification_status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Original Policy (Previously Rejected)
                      </h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{workaround.originalBillTitle}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        {getWorkaroundTypeIcon(workaround.workaroundType)}
                        Current Implementation Method
                      </h4>
                      <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{workaround.workaroundBillTitle}</p>
                    </div>
                  </div>

                  {/* Enhanced bypass mechanism explanation */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Constitutional Bypass Mechanism Analysis:</h4>
                    <p className="text-sm text-gray-700 mb-2">{getBypassDescription(workaround)}</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>Branch:</strong> <span className="flex items-center gap-1 mt-1">{getBranchIcon(workaround.bypassMechanism.branchOfGovernment)} {workaround.bypassMechanism.branchOfGovernment}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>Level:</strong> <span className="capitalize">{workaround.bypassMechanism.institutionalLevel}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>Timing:</strong> <span className="capitalize">{workaround.bypassMechanism.timingStrategy}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Detection Analysis:</h4>
                    <p className="text-sm text-gray-700">{workaround.detectionReason}</p>
                  </div>

                  {/* Enhanced similarity metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getSeverityColor(workaround.similarityScore)}`}>
                        {workaround.similarityScore}%
                      </div>
                      <div className="text-xs text-gray-600">Overall Similarity</div>
                    </div>

                    {workaround.similarityAnalysis && (
                      <>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {workaround.similarityAnalysis.policyObjectiveSimilarity || workaround.similarityAnalysis.textSimilarity}%
                          </div>
                          <div className="text-xs text-gray-600">Policy Objective</div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {workaround.similarityAnalysis.implementationPathSimilarity || workaround.similarityAnalysis.structuralSimilarity}%
                          </div>
                          <div className="text-xs text-gray-600">Implementation</div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {workaround.similarityAnalysis.stakeholderImpactSimilarity || workaround.similarityAnalysis.intentSimilarity}%
                          </div>
                          <div className="text-xs text-gray-600">Impact</div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Community Confirmations: <strong>{workaround.communityConfirmations}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Detected: {new Date(workaround.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {workaround.reportedBy && (
                    <div className="text-sm text-gray-600">
                      Reported by: <strong>{workaround.reportedBy.name}</strong> ({workaround.reportedBy.role})
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/bills/${workaround.originalBillId}`, '_blank')}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      View Original Policy
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedWorkaround(workaround)}
                    >
                      View Analysis Details
                    </Button>

                    {workaround.verification_status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleConfirmWorkaround(workaround.id)}
                      >
                        Confirm Workaround
                      </Button>
                    )}

                    {workaround.evidenceDocuments && workaround.evidenceDocuments.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                      >
                        View Evidence ({workaround.evidenceDocuments.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Enhanced Detailed Analysis Dialog */}
      {selectedWorkaround && (
        <Dialog open={!!selectedWorkaround} onOpenChange={() => setSelectedWorkaround(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detailed Workaround Analysis</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Previous rejection details */}
              {selectedWorkaround.circumventionPattern && (
                <div>
                  <h4 className="font-semibold mb-2">Previous Rejection Details:</h4>
                  <div className="bg-red-50 p-3 rounded space-y-2">
                    <div><strong>Rejection Type:</strong> {selectedWorkaround.circumventionPattern.previousRejectionDetails.rejectionType.replace('_', ' ')}</div>
                    <div><strong>Date:</strong> {new Date(selectedWorkaround.circumventionPattern.previousRejectionDetails.rejectionDate).toLocaleDateString()}</div>
                    <div><strong>Reason:</strong> {selectedWorkaround.circumventionPattern.previousRejectionDetails.rejectionReason}</div>
                    {selectedWorkaround.circumventionPattern.previousRejectionDetails.oppositionSources.length > 0 && (
                      <div><strong>Opposition Sources:</strong> {selectedWorkaround.circumventionPattern.previousRejectionDetails.oppositionSources.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Workaround strategy details */}
              {selectedWorkaround.circumventionPattern && (
                <div>
                  <h4 className="font-semibold mb-2">Workaround Strategy:</h4>
                  <div className="bg-orange-50 p-3 rounded space-y-2">
                    <div><strong>Authority Used:</strong> {selectedWorkaround.circumventionPattern.workaroundStrategy.authorityUsed}</div>
                    <div><strong>Justification:</strong> {selectedWorkaround.circumventionPattern.workaroundStrategy.justificationProvided}</div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <strong>Public Participation Bypassed:</strong> 
                        <span className={selectedWorkaround.circumventionPattern.workaroundStrategy.publicParticipationBypassed ? 'text-red-600 ml-2' : 'text-green-600 ml-2'}>
                          {selectedWorkaround.circumventionPattern.workaroundStrategy.publicParticipationBypassed ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <strong>Parliamentary Oversight Bypassed:</strong>
                        <span className={selectedWorkaround.circumventionPattern.workaroundStrategy.parliamentaryOversightBypassed ? 'text-red-600 ml-2' : 'text-green-600 ml-2'}>
                          {selectedWorkaround.circumventionPattern.workaroundStrategy.parliamentaryOversightBypassed ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    {selectedWorkaround.circumventionPattern.workaroundStrategy.constitutionalConcerns.length > 0 && (
                      <div>
                        <strong>Constitutional Concerns:</strong>
                        <ul className="list-disc list-inside mt-1 ml-4">
                          {selectedWorkaround.circumventionPattern.workaroundStrategy.constitutionalConcerns.map((concern, index) => (
                            <li key={index} className="text-red-700">{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedWorkaround.similarityAnalysis && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Common Elements:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedWorkaround.similarityAnalysis.commonElements.map((element, index) => (
                        <li key={index} className="text-gray-700">{element}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Key Differences (Potential Workaround Strategies):</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedWorkaround.similarityAnalysis.keyDifferences.map((difference, index) => (
                        <li key={index} className="text-orange-700">{difference}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Enhanced evidence documents section */}
              {selectedWorkaround.evidenceDocuments && selectedWorkaround.evidenceDocuments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Evidence Documents:</h4>
                  <div className="space-y-2">
                    {selectedWorkaround.evidenceDocuments.map((doc, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{doc.type.replace('_', ' ').toUpperCase()}</div>
                          <div className="text-sm text-gray-600">{doc.description}</div>
                          <div className="text-xs text-gray-500">
                            Issued by {doc.issuingAuthority} on {new Date(doc.dateIssued).toLocaleDateString()}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.url, '_blank')}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

