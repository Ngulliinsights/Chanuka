import {
import React from 'react';

  BookOpen,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  X,
  Clock,
  Scale,
  AlertCircle,
} from 'lucide-react';
import { useState, useMemo } from 'react';

// Types
interface LegislationOutcome {
  id: string;
  title: string;
  year: number;
  jurisdiction: string;
  status: 'passed' | 'failed' | 'amended' | 'withdrawn' | 'pending';
  similarity: 'high' | 'medium' | 'low';
  keyProvisions: string[];
  outcome: {
    result: 'successful' | 'unsuccessful' | 'mixed' | 'unknown';
    impact: string;
    lessons: string[];
    challenges: string[];
  };
  constitutionalChallenges?: {
    filed: boolean;
    outcome?: 'upheld' | 'struck_down' | 'modified' | 'pending';
    details?: string;
  };
  publicSupport: {
    initial: number;
    final: number;
    keyFactors: string[];
  };
  timeline: {
    introduced: string;
    passed?: string;
    implemented?: string;
    challenged?: string;
  };
}

interface HistoricalPrecedentsProps {
  billId: string;
  billTitle: string;
  precedents: LegislationOutcome[];
  className?: string;
  loading?: boolean;
  error?: string;
}

/**
 * HistoricalPrecedents - Shows similar legislation outcomes and lessons learned
 * Features: Outcome analysis, success factors, constitutional challenges, public support trends
 *
 * Usage:
 * ```tsx
 * // With API data
 * const { data, loading, error } = useHistoricalPrecedents(billId);
 * <HistoricalPrecedents
 *   billId={billId}
 *   billTitle={billTitle}
 *   precedents={data}
 *   loading={loading}
 *   error={error}
 * />
 *
 * // With mock data for development
 * <HistoricalPrecedents
 *   billId="mock-1"
 *   billTitle="Climate Action Bill 2024"
 *   precedents={MOCK_PRECEDENTS}
 * />
 * ```
 */
export function HistoricalPrecedents({
  billId: _billId,
  billTitle: _billTitle,
  precedents,
  className = '',
  loading = false,
  error,
}: HistoricalPrecedentsProps) {
  const [expandedPrecedents, setExpandedPrecedents] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSimilarity, setFilterSimilarity] = useState<string | null>(null);

  const togglePrecedent = (precedentId: string) => {
    setExpandedPrecedents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(precedentId)) {
        newSet.delete(precedentId);
      } else {
        newSet.add(precedentId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      passed: 'text-green-600 bg-green-50 border-green-200',
      failed: 'text-red-600 bg-red-50 border-red-200',
      amended: 'text-blue-600 bg-blue-50 border-blue-200',
      withdrawn: 'text-gray-600 bg-gray-50 border-gray-200',
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    };
    return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      passed: <CheckCircle className="h-4 w-4" />,
      failed: <X className="h-4 w-4" />,
      amended: <FileText className="h-4 w-4" />,
      withdrawn: <Minus className="h-4 w-4" />,
      pending: <Clock className="h-4 w-4" />,
    };
    return icons[status] || <FileText className="h-4 w-4" />;
  };

  const getSimilarityColor = (similarity: string): string => {
    const colors: Record<string, string> = {
      high: 'bg-purple-100 text-purple-800 border-purple-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[similarity] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getOutcomeIcon = (result: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      successful: <TrendingUp className="h-4 w-4 text-green-600" />,
      unsuccessful: <TrendingDown className="h-4 w-4 text-red-600" />,
      mixed: <Minus className="h-4 w-4 text-yellow-600" />,
      unknown: <Clock className="h-4 w-4 text-gray-600" />,
    };
    return icons[result] || <Clock className="h-4 w-4" />;
  };

  const getSupportTrend = (initial: number, final: number) => {
    const diff = final - initial;
    if (diff > 5) return { icon: <TrendingUp className="h-3 w-3" />, color: 'text-green-600' };
    if (diff < -5) return { icon: <TrendingDown className="h-3 w-3" />, color: 'text-red-600' };
    return { icon: <Minus className="h-3 w-3" />, color: 'text-gray-600' };
  };

  const filteredPrecedents = useMemo(() => {
    return precedents.filter(p => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterSimilarity && p.similarity !== filterSimilarity) return false;
      return true;
    });
  }, [precedents, filterStatus, filterSimilarity]);

  const stats = useMemo(() => {
    if (precedents.length === 0) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        avgSupport: 0,
        constitutionalChallenges: 0,
      };
    }

    return {
      total: precedents.length,
      passed: precedents.filter(p => p.status === 'passed').length,
      failed: precedents.filter(p => p.status === 'failed').length,
      avgSupport: Math.round(
        precedents.reduce((acc, p) => acc + p.publicSupport.final, 0) / precedents.length
      ),
      constitutionalChallenges: precedents.filter(p => p.constitutionalChallenges?.filed).length,
    };
  }, [precedents]);

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">Loading historical precedents...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Error Loading Precedents</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (precedents.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            No Historical Precedents Found
          </h3>
          <p className="text-sm text-gray-600">
            There are no similar bills in our database at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card */}
      <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-orange-500">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Historical Precedents</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Learn from similar legislation outcomes and historical patterns
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-orange-50">
              <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Similar Bills</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{stats.avgSupport}%</div>
              <div className="text-sm text-gray-600">Avg Support</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {stats.constitutionalChallenges}
              </div>
              <div className="text-sm text-gray-600">Challenged</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Filter Precedents</h3>
          <p className="text-sm text-gray-600 mb-4">
            Focus on specific types of outcomes or similarity levels
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">By Status</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    filterStatus === null
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setFilterStatus(null)}
                >
                  All Status
                </button>
                {(['passed', 'failed', 'amended', 'withdrawn', 'pending'] as const).map(status => (
                  <button
                    key={status}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5 ${
                      filterStatus === status
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setFilterStatus(status)}
                  >
                    {getStatusIcon(status)}
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">By Similarity</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    filterSimilarity === null
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setFilterSimilarity(null)}
                >
                  All Levels
                </button>
                {(['high', 'medium', 'low'] as const).map(similarity => (
                  <button
                    key={similarity}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      filterSimilarity === similarity
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setFilterSimilarity(similarity)}
                  >
                    <span className="capitalize">{similarity} Similarity</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Precedents List */}
      <div className="space-y-4">
        {filteredPrecedents.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600">No precedents match the selected filters.</p>
          </div>
        ) : (
          filteredPrecedents.map(precedent => {
            const isExpanded = expandedPrecedents.has(precedent.id);
            const trend = getSupportTrend(
              precedent.publicSupport.initial,
              precedent.publicSupport.final
            );

            return (
              <div key={precedent.id} className="bg-white rounded-lg border border-gray-200">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => togglePrecedent(precedent.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`${getStatusColor(precedent.status)} p-1 rounded`}>
                          {getStatusIcon(precedent.status)}
                        </div>
                        <h3 className="font-semibold text-gray-900">{precedent.title}</h3>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {precedent.year}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {precedent.jurisdiction}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(precedent.status)}`}
                        >
                          {precedent.status.toUpperCase()}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getSimilarityColor(precedent.similarity)}`}
                        >
                          {precedent.similarity.toUpperCase()} SIMILARITY
                        </span>
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${trend.color}`}
                        >
                          {trend.icon}
                          {precedent.publicSupport.final}% support
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <div className="space-y-6">
                      {/* Key Provisions */}
                      <div>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Key Provisions
                        </h4>
                        <ul className="space-y-2">
                          {precedent.keyProvisions.map((provision, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-gray-700"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                              {provision}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Outcome Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            {getOutcomeIcon(precedent.outcome.result)}
                            Outcome Analysis
                          </h4>
                          <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-gray-50">
                              <h5 className="font-medium text-sm mb-1 text-gray-900">Impact</h5>
                              <p className="text-sm text-gray-600">{precedent.outcome.impact}</p>
                            </div>

                            <div>
                              <h5 className="font-medium text-sm mb-2 text-gray-900">
                                Lessons Learned
                              </h5>
                              <ul className="space-y-2">
                                {precedent.outcome.lessons.map((lesson, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2 text-sm text-gray-700"
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{lesson}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-medium text-sm mb-2 text-gray-900">
                                Challenges Faced
                              </h5>
                              <ul className="space-y-2">
                                {precedent.outcome.challenges.map((challenge, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2 text-sm text-gray-700"
                                  >
                                    <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <span>{challenge}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Public Support Trend */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-600" />
                              Public Support
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Initial Support:</span>
                                <span className="font-medium text-gray-900">
                                  {precedent.publicSupport.initial}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Final Support:</span>
                                <span
                                  className={`font-medium flex items-center gap-1 ${trend.color}`}
                                >
                                  {trend.icon}
                                  {precedent.publicSupport.final}%
                                </span>
                              </div>
                              <div className="mt-3">
                                <h6 className="text-xs font-medium mb-2 text-gray-900">
                                  Key Factors:
                                </h6>
                                <ul className="space-y-1.5">
                                  {precedent.publicSupport.keyFactors.map((factor, index) => (
                                    <li
                                      key={index}
                                      className="text-xs text-gray-600 flex items-start gap-2"
                                    >
                                      <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                                      {factor}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Constitutional Challenges */}
                          {precedent.constitutionalChallenges?.filed && (
                            <div>
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <Scale className="h-4 w-4 text-purple-600" />
                                Constitutional Challenge
                              </h4>
                              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-purple-300 text-purple-800 mb-2">
                                  {precedent.constitutionalChallenges.outcome?.toUpperCase() ||
                                    'PENDING'}
                                </span>
                                {precedent.constitutionalChallenges.details && (
                                  <p className="text-sm text-gray-700 mt-2">
                                    {precedent.constitutionalChallenges.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-600" />
                              Timeline
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 w-24">Introduced:</span>
                                <span className="text-gray-900">
                                  {precedent.timeline.introduced}
                                </span>
                              </div>
                              {precedent.timeline.passed && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 w-24">Passed:</span>
                                  <span className="text-gray-900">{precedent.timeline.passed}</span>
                                </div>
                              )}
                              {precedent.timeline.implemented && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 w-24">Implemented:</span>
                                  <span className="text-gray-900">
                                    {precedent.timeline.implemented}
                                  </span>
                                </div>
                              )}
                              {precedent.timeline.challenged && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 w-24">Challenged:</span>
                                  <span className="text-gray-900">
                                    {precedent.timeline.challenged}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Insights Summary */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Key Insights</h3>
          <p className="text-sm text-gray-600 mb-6">
            What history tells us about similar legislation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Success Factors</h4>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Strong cross-party support increases passage likelihood by 60%</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Clear constitutional basis reduces challenge risk significantly</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Gradual implementation improves public acceptance and compliance</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Common Pitfalls</h4>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Insufficient funding mechanisms lead to implementation failures</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Vague language creates enforcement challenges and legal disputes</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Lack of stakeholder consultation increases opposition and resistance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOCK DATA - Replace with API calls in production
// ============================================================================

/**
 * Mock data for development and testing
 *
 * In production, replace this with API integration:
 *
 * ```tsx
 * // api/historicalPrecedents.ts
 * export async function fetchHistoricalPrecedents(billId: string): Promise<LegislationOutcome[]> {
 *   const response = await fetch(`/api/bills/${billId}/precedents`);
 *   if (!response.ok) throw new Error('Failed to fetch precedents');
 *   return response.json();
 * }
 *
 * // Usage with React Query or SWR
 * const { data, loading, error } = useQuery(
 *   ['precedents', billId],
 *   () => fetchHistoricalPrecedents(billId)
 * );
 * ```
 */
export const MOCK_KENYAN_PRECEDENTS: LegislationOutcome[] = [
  {
    id: '1',
    title: 'Climate Change Act, 2016',
    year: 2016,
    jurisdiction: 'National Assembly',
    status: 'passed',
    similarity: 'high',
    keyProvisions: [
      'Mandates 10% reduction in greenhouse gas emissions by 2030',
      'Establishes National Climate Change Council',
      'Creates Climate Change Fund for adaptation and mitigation projects',
      'Requires climate impact assessments for major development projects',
    ],
    outcome: {
      result: 'successful',
      impact:
        'Led to establishment of climate-focused institutions and increased renewable energy adoption by 35% within 5 years',
      lessons: [
        'Strong institutional framework enabled effective implementation',
        'Dedicated funding mechanism critical for project execution',
        'Public awareness campaigns improved compliance and participation',
        'County-level buy-in essential for devolved climate action',
      ],
      challenges: [
        'Initial resistance from industrial stakeholders',
        'Coordination challenges between national and county governments',
        'Limited technical capacity in some counties',
        'Funding gaps in Climate Change Fund',
      ],
    },
    constitutionalChallenges: {
      filed: true,
      outcome: 'upheld',
      details:
        'High Court dismissed petition challenging carbon tax provisions, affirming state authority over environmental regulation under Article 42 of Constitution',
    },
    publicSupport: {
      initial: 62,
      final: 78,
      keyFactors: [
        'Visible climate impacts (droughts, floods) increased urgency',
        'International climate commitments (Paris Agreement)',
        'Youth-led climate activism and awareness',
        'Economic opportunities in green sectors',
      ],
    },
    timeline: {
      introduced: 'March 2015',
      passed: 'May 2016',
      implemented: 'March 2017',
      challenged: 'August 2017',
    },
  },
  {
    id: '2',
    title: 'Affordable Housing Bill (Nairobi County)',
    year: 2020,
    jurisdiction: 'Nairobi County Assembly',
    status: 'amended',
    similarity: 'high',
    keyProvisions: [
      'Requires 30% affordable housing units in developments over 5 acres',
      'Establishes County Housing Fund for low-income residents',
      'Provides property tax incentives for affordable housing developers',
      'Creates fast-track approval process for affordable housing projects',
    ],
    outcome: {
      result: 'mixed',
      impact:
        'Increased affordable housing stock by 18% but faced implementation delays and developer resistance. Amended to reduce quota to 20% in 2022',
      lessons: [
        'Need for realistic targets aligned with market conditions',
        'Stronger enforcement mechanisms required',
        'Developer engagement crucial from policy design stage',
        'Phased implementation more effective than immediate full requirements',
      ],
      challenges: [
        'Developer concerns about profit margins and viability',
        'Disagreements over definition of "affordable" housing',
        'Delays in disbursement from County Housing Fund',
        'Land acquisition challenges in prime locations',
        'Coordination issues with national housing programs',
      ],
    },
    publicSupport: {
      initial: 71,
      final: 64,
      keyFactors: [
        'Housing crisis created strong initial support',
        'Middle-class concerns about property values',
        'Implementation challenges eroded confidence',
        'Political disagreements over amendments',
      ],
    },
    timeline: {
      introduced: 'January 2019',
      passed: 'September 2019',
      implemented: 'March 2020',
    },
  },
  {
    id: '3',
    title: 'Minimum Wage Amendment Bill, 2022',
    year: 2022,
    jurisdiction: 'National Assembly',
    status: 'failed',
    similarity: 'medium',
    keyProvisions: [
      'Increases minimum wage to KES 25,000 over 3 years',
      'Establishes automatic inflation-linked adjustments',
      'Exemptions for SMEs with under 20 employees',
      'Creates compliance monitoring and enforcement unit',
    ],
    outcome: {
      result: 'unsuccessful',
      impact:
        'Bill defeated in second reading after strong opposition from business community and economic concerns raised by Treasury',
      lessons: [
        'Need for comprehensive economic impact assessments',
        'Broader stakeholder consultation required earlier in process',
        'Timing critical - introduced during high inflation period',
        'Gradual increases may have gained more support',
        'Alternative support mechanisms for SMEs needed',
      ],
      challenges: [
        'Strong opposition from Federation of Kenya Employers',
        'Treasury concerns about inflation and job losses',
        'Trade union demands for higher figures',
        'Regional wage disparities not adequately addressed',
        'Fears of increased unemployment and automation',
      ],
    },
    publicSupport: {
      initial: 58,
      final: 51,
      keyFactors: [
        'High cost of living increased worker support',
        'Business community media campaign highlighting risks',
        'Economic experts divided on potential impacts',
        'Political party divisions weakened momentum',
      ],
    },
    timeline: {
      introduced: 'June 2021',
    },
  },
  {
    id: '4',
    title: 'Forest Conservation and Management Act, 2016',
    year: 2016,
    jurisdiction: 'National Assembly',
    status: 'passed',
    similarity: 'medium',
    keyProvisions: [
      'Bans logging in all public forests',
      'Establishes community forest associations with management rights',
      'Requires 10% forest cover increase by 2030',
      'Creates forest restoration and rehabilitation fund',
    ],
    outcome: {
      result: 'successful',
      impact:
        'Increased forest cover from 6.99% to 8.8% by 2023, restored over 50,000 hectares, and empowered 400+ community forest associations',
      lessons: [
        'Community participation model proved highly effective',
        'Alternative livelihood programs reduced illegal logging',
        'Strong presidential backing ensured implementation',
        'Technology (satellite monitoring) enhanced enforcement',
      ],
      challenges: [
        'Displacement concerns for forest-adjacent communities',
        'Initial resistance from timber industry',
        'Funding constraints for restoration programs',
        'Human-wildlife conflict increased in some areas',
      ],
    },
    constitutionalChallenges: {
      filed: true,
      outcome: 'modified',
      details:
        'Court ordered government to provide compensation and resettlement for communities displaced by forest protection measures',
    },
    publicSupport: {
      initial: 68,
      final: 82,
      keyFactors: [
        'Visible environmental degradation created urgency',
        'Community forest model built local support',
        'International funding for restoration projects',
        'Climate change awareness campaigns',
        'Alternative livelihood programs reduced opposition',
      ],
    },
    timeline: {
      introduced: 'November 2015',
      passed: 'October 2016',
      implemented: 'January 2017',
      challenged: 'March 2017',
    },
  },
  {
    id: '5',
    title: 'Digital Economy Bill, 2019',
    year: 2019,
    jurisdiction: 'National Assembly',
    status: 'withdrawn',
    similarity: 'low',
    keyProvisions: [
      'Imposes 1.5% digital services tax on online transactions',
      'Requires digital platforms to register local entities',
      'Mandates data localization for financial services',
      'Creates regulatory framework for digital currencies',
    ],
    outcome: {
      result: 'unsuccessful',
      impact:
        'Withdrawn after stakeholder concerns and international pressure regarding data localization requirements',
      lessons: [
        'Need to balance revenue generation with innovation ecosystem',
        'International trade implications require careful consideration',
        'Technology sector consultation essential from start',
        'Data sovereignty goals need pragmatic implementation',
        'Phased approach may have been more successful',
      ],
      challenges: [
        'Opposition from tech companies and digital platforms',
        'Concerns about stifling digital innovation',
        'International trade agreement conflicts',
        'Implementation complexity and cost',
        'Privacy and security concerns around data localization',
      ],
    },
    publicSupport: {
      initial: 45,
      final: 38,
      keyFactors: [
        'Public split between revenue needs and innovation concerns',
        'Tech sector lobbying and awareness campaigns',
        'International business community pressure',
        'Limited public understanding of technical implications',
      ],
    },
    timeline: {
      introduced: 'March 2019',
    },
  },
];

// Demo component showing usage
export default function HistoricalPrecedentsDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Historical Precedents Component</h1>
          <p className="text-gray-600">
            Analyzing similar legislation outcomes with Kenyan examples
          </p>
        </div>

        <HistoricalPrecedents
          billId="demo-bill-1"
          billTitle="Climate Action Bill 2024"
          precedents={MOCK_KENYAN_PRECEDENTS}
        />
      </div>
    </div>
  );
}
