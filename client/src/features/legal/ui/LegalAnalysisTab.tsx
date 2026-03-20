/**
 * LegalAnalysisTab Component
 * 
 * Displays constitutional analysis of a bill including:
 * - Alignment score with constitution (0-100%)
 * - Identified constitutional conflicts
 * - Legal risks and mitigation strategies
 * - Related legal precedents
 * - Hidden provisions and loopholes
 */

import React, { useState } from 'react';

interface ConstitutionalAnalysis {
  id: string;
  bill_id: string;
  alignment_score: number;
  legal_risk_level: string;
  total_conflicts: number;
  critical_conflicts: number;
  moderate_conflicts: number;
  executive_summary: string;
}

interface LegalAnalysisTabProps {
  billId: string;
  analysis?: ConstitutionalAnalysis;
  isLoading?: boolean;
  error?: Error | null;
}

export function LegalAnalysisTab({ billId, analysis, isLoading, error }: LegalAnalysisTabProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'conflicts' | 'risks' | 'precedents'>('overview');

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-gray-600">Analyzing constitutional compliance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Failed to load legal analysis</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>No legal analysis available for this bill yet</p>
      </div>
    );
  }

  const riskColors = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    moderate: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-green-50 border-green-200 text-green-800'
  };

  const riskBadgeColors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-6">
      {/* Alignment Score Card */}
      <div className={`border rounded-lg p-6 ${riskColors[analysis.legal_risk_level as keyof typeof riskColors] || riskColors.moderate}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Constitutional Alignment Score</h3>
            <p className="text-sm opacity-75 mt-1">Based on analysis of constitutional provisions</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${riskBadgeColors[analysis.legal_risk_level as keyof typeof riskBadgeColors] || riskBadgeColors.moderate}`}>
            {analysis.legal_risk_level.toUpperCase()}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">{analysis.alignment_score}</span>
            <span className="text-xl opacity-75">/ 100%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                analysis.alignment_score >= 75 ? 'bg-green-500' :
                analysis.alignment_score >= 50 ? 'bg-yellow-500' :
                analysis.alignment_score >= 25 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, analysis.alignment_score)}%` }}
            />
          </div>
        </div>

        <p className="text-sm leading-relaxed">
          {analysis.executive_summary || 'This bill has been analyzed for constitutional compliance. Review conflicts and risks below.'}
        </p>
      </div>

      {/* Conflict Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-800">{analysis.total_conflicts}</div>
          <div className="text-sm text-gray-600 mt-1">Total Conflicts</div>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{analysis.critical_conflicts}</div>
          <div className="text-sm text-red-600 mt-1">Critical</div>
        </div>
        <div className="bg-white border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{analysis.moderate_conflicts}</div>
          <div className="text-sm text-yellow-600 mt-1">Moderate</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {(['overview', 'conflicts', 'risks', 'precedents'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <ConstitutionalOverview analysis={analysis} />
        )}
        {activeTab === 'conflicts' && (
          <ConflictsList billId={billId} analysisId={analysis.id} />
        )}
        {activeTab === 'risks' && (
          <LegalRisksList billId={billId} analysisId={analysis.id} />
        )}
        {activeTab === 'precedents' && (
          <PrecedentsList billId={billId} />
        )}
      </div>
    </div>
  );
}

/**
 * ConstitutionalOverview Component
 */
function ConstitutionalOverview({ analysis }: { analysis: ConstitutionalAnalysis }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How is this score calculated?</h4>
        <p className="text-sm text-blue-800">
          The alignment score is based on:
        </p>
        <ul className="text-sm text-blue-800 list-disc list-inside mt-2 space-y-1">
          <li>Number and severity of constitutional conflicts identified</li>
          <li>Matching with constitutional provisions</li>
          <li>Historical precedent analysis</li>
          <li>Risk assessment of implementation</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">Analysis Insights</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• <strong>High-risk areas:</strong> Review the Conflicts tab for detailed analysis</p>
          <p>• <strong>Precedent comparison:</strong> See related court cases in the Precedents tab</p>
          <p>• <strong>Mitigation options:</strong> View suggested amendments in the Risks tab</p>
        </div>
      </div>
    </div>
  );
}

/**
 * ConflictsList Component
 */
function ConflictsList({ billId, analysisId }: { billId: string; analysisId: string }) {
  const [conflicts] = useState([
    {
      id: '1',
      provision: 'Article 33 - Freedom of Expression',
      severity: 'critical',
      description: 'Bill language could restrict free speech beyond constitutional limits',
      billLanguage: 'Section 2.3.1 restricts speech...',
      resolution: 'Amend to include explicit carve-out for protected speech'
    }
  ]);

  return (
    <div className="space-y-3">
      {conflicts.length === 0 ? (
        <p className="text-gray-600 py-8 text-center">No conflicts identified</p>
      ) : (
        conflicts.map(conflict => (
          <div key={conflict.id} className={`border rounded-lg p-4 ${
            conflict.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-800">{conflict.provision}</h4>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                conflict.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {conflict.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{conflict.description}</p>
            <div className="bg-white rounded p-2 text-xs mb-2 border border-gray-200">
              <p className="font-mono text-gray-600">{conflict.billLanguage}</p>
            </div>
            <p className="text-sm text-gray-700"><strong>Suggested Resolution:</strong> {conflict.resolution}</p>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * LegalRisksList Component
 */
function LegalRisksList({ billId, analysisId }: { billId: string; analysisId: string }) {
  const [risks] = useState([
    {
      id: '1',
      category: 'Implementation Barrier',
      title: 'Lack of enforcement mechanism',
      probability: 85,
      impact: 70,
      mitigation: 'Add specific enforcement authority and penalties'
    }
  ]);

  return (
    <div className="space-y-3">
      {risks.length === 0 ? (
        <p className="text-gray-600 py-8 text-center">No significant legal risks identified</p>
      ) : (
        risks.map(risk => (
          <div key={risk.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-800">{risk.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{risk.category}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((risk.probability * risk.impact) / 100)}
                </div>
                <div className="text-xs text-gray-600">Risk Score</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-600">Probability</div>
                <div className="font-semibold text-gray-800">{risk.probability}%</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-600">Impact</div>
                <div className="font-semibold text-gray-800">{risk.impact}%</div>
              </div>
            </div>
            <p className="text-sm text-gray-700"><strong>Mitigation:</strong> {risk.mitigation}</p>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * PrecedentsList Component
 */
function PrecedentsList({ billId }: { billId: string }) {
  const [precedents] = useState([
    {
      id: '1',
      caseName: 'Landmark Case v. State',
      citation: '2020 eKLR 123',
      year: 2020,
      relevance: 'Highly Relevant',
      holding: 'Established that restrictions must meet strict scrutiny test'
    }
  ]);

  return (
    <div className="space-y-3">
      {precedents.length === 0 ? (
        <p className="text-gray-600 py-8 text-center">No related precedents found</p>
      ) : (
        precedents.map(precedent => (
          <div key={precedent.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-800">{precedent.caseName}</h4>
                <p className="text-xs text-gray-600 mt-1">{precedent.citation} ({precedent.year})</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {precedent.relevance}
              </span>
            </div>
            <p className="text-sm text-gray-700">{precedent.holding}</p>
          </div>
        ))
      )}
    </div>
  );
}
