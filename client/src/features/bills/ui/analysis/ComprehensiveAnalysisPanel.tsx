/**
 * Comprehensive Analysis Panel
 *
 * Displays comprehensive bill analysis including constitutional analysis,
 * stakeholder impact, transparency scores, and public interest assessment.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { AlertTriangle, CheckCircle, TrendingUp, Users, Shield, Eye } from 'lucide-react';
import type { ComprehensiveBillAnalysis } from '@shared/types/features/analysis';

interface ComprehensiveAnalysisPanelProps {
  analysis: ComprehensiveBillAnalysis;
}

export function ComprehensiveAnalysisPanel({ analysis }: ComprehensiveAnalysisPanelProps) {
  const {
    constitutionalAnalysis,
    conflictAnalysisSummary,
    stakeholderImpact,
    transparency_score,
    publicInterestScore,
    recommendedActions,
    overallConfidence,
  } = analysis;

  return (
    <div className="space-y-6">
      {/* Overall Confidence Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Analysis Confidence: {overallConfidence}%
          </CardTitle>
          <CardDescription>Overall confidence in this automated analysis</CardDescription>
        </CardHeader>
      </Card>

      {/* Constitutional Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Constitutional Analysis
          </CardTitle>
          <CardDescription>
            Score: {constitutionalAnalysis.constitutionalityScore}/100 | Risk:{' '}
            {constitutionalAnalysis.riskAssessment.toUpperCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Risk Assessment */}
            <div className="flex items-center gap-2">
              {constitutionalAnalysis.riskAssessment === 'low' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle
                  className={`h-5 w-5 ${
                    constitutionalAnalysis.riskAssessment === 'high'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}
                />
              )}
              <span className="font-medium">
                {constitutionalAnalysis.concerns.length} constitutional concern(s) identified
              </span>
            </div>

            {/* Concerns List */}
            {constitutionalAnalysis.concerns.length > 0 && (
              <div className="space-y-2">
                {constitutionalAnalysis.concerns.map((concern, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-l-4 ${
                      concern.severity === 'critical'
                        ? 'border-red-500 bg-red-50'
                        : concern.severity === 'major'
                          ? 'border-orange-500 bg-orange-50'
                          : concern.severity === 'moderate'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="font-semibold text-sm">
                      {concern.article}: {concern.concern}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{concern.explanation}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Precedents */}
            {constitutionalAnalysis.precedents.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Relevant Legal Precedents</h4>
                <div className="space-y-2">
                  {constitutionalAnalysis.precedents.slice(0, 3).map((precedent, idx) => (
                    <div key={idx} className="text-sm p-2 bg-muted/50 rounded">
                      <div className="font-medium">
                        {precedent.caseName} ({precedent.year})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Relevance: {precedent.relevance}% | {precedent.outcome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflict of Interest Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Conflict of Interest Analysis
          </CardTitle>
          <CardDescription>
            Risk Level: {conflictAnalysisSummary.overallRisk.toUpperCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {conflictAnalysisSummary.affectedSponsorsCount}
              </div>
              <div className="text-xs text-muted-foreground">Affected Sponsors</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {conflictAnalysisSummary.directConflictCount}
              </div>
              <div className="text-xs text-muted-foreground">Direct Conflicts</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {conflictAnalysisSummary.indirectConflictCount}
              </div>
              <div className="text-xs text-muted-foreground">Indirect Conflicts</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                ${(conflictAnalysisSummary.totalFinancialExposureEstimate / 1000000).toFixed(1)}M
              </div>
              <div className="text-xs text-muted-foreground">Financial Exposure</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stakeholder Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Stakeholder Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Economic Impact */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Economic Impact</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 bg-red-50 rounded text-center">
                  <div className="text-sm font-medium">Cost</div>
                  <div className="text-lg font-bold text-red-600">
                    ${(stakeholderImpact.economicImpact.estimatedCost / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded text-center">
                  <div className="text-sm font-medium">Benefit</div>
                  <div className="text-lg font-bold text-green-600">
                    ${(stakeholderImpact.economicImpact.estimatedBenefit / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded text-center">
                  <div className="text-sm font-medium">Net Impact</div>
                  <div
                    className={`text-lg font-bold ${
                      stakeholderImpact.economicImpact.netImpact >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ${(stakeholderImpact.economicImpact.netImpact / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Timeframe: {stakeholderImpact.economicImpact.timeframe} | Confidence:{' '}
                {stakeholderImpact.economicImpact.confidence}%
              </div>
            </div>

            {/* Social Impact */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Social Impact Scores</h4>
              <div className="space-y-2">
                <ImpactBar
                  label="Equity Effect"
                  value={stakeholderImpact.socialImpact.equityEffect}
                />
                <ImpactBar
                  label="Accessibility"
                  value={stakeholderImpact.socialImpact.accessibilityEffect}
                />
                <ImpactBar
                  label="Public Health"
                  value={stakeholderImpact.socialImpact.publicHealthEffect}
                />
                <ImpactBar
                  label="Environmental"
                  value={stakeholderImpact.socialImpact.environmentalEffect}
                />
              </div>
            </div>

            {/* Beneficiaries */}
            {stakeholderImpact.primaryBeneficiaries.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Primary Beneficiaries</h4>
                <div className="space-y-1">
                  {stakeholderImpact.primaryBeneficiaries.slice(0, 3).map((group, idx) => (
                    <div
                      key={idx}
                      className="text-sm flex justify-between items-center p-2 bg-green-50 rounded"
                    >
                      <span>{group.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ~{(group.sizeEstimate / 1000).toFixed(0)}K people
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transparency Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Transparency Score: {transparency_score.grade}
          </CardTitle>
          <CardDescription>Overall: {transparency_score.overall}/100</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <ScoreBar
              label="Sponsor Disclosure"
              value={transparency_score.breakdown.sponsorDisclosure}
            />
            <ScoreBar
              label="Legislative Process"
              value={transparency_score.breakdown.legislativeProcess}
            />
            <ScoreBar
              label="Financial Conflicts"
              value={transparency_score.breakdown.financialConflicts}
            />
            <ScoreBar
              label="Public Accessibility"
              value={transparency_score.breakdown.publicAccessibility}
            />
          </div>
        </CardContent>
      </Card>

      {/* Public Interest Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Public Interest Score: {publicInterestScore.assessment}
          </CardTitle>
          <CardDescription>Overall: {publicInterestScore.score}/100</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded">
              <div className="text-lg font-bold">
                {publicInterestScore.factors.economicScoreNormalized}
              </div>
              <div className="text-xs text-muted-foreground">Economic</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded">
              <div className="text-lg font-bold">
                {publicInterestScore.factors.socialScoreNormalized}
              </div>
              <div className="text-xs text-muted-foreground">Social</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded">
              <div className="text-lg font-bold">
                {publicInterestScore.factors.transparency_score}
              </div>
              <div className="text-xs text-muted-foreground">Transparency</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      {recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Suggested next steps based on analysis findings</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.max(0, Math.min(100, value));
  const color =
    percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{percentage}/100</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ImpactBar({ label, value }: { label: string; value: number }) {
  // Value is -100 to 100, normalize to 0-100 for display
  const normalized = (value + 100) / 2;
  const color = value >= 30 ? 'bg-green-500' : value >= -30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">
          {value > 0 ? '+' : ''}
          {value}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}
