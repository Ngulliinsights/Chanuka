import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@client/services/apiService';
import type { ClauseTranslation, TranslationResponse } from '@shared/types/bills/translation.types';

interface PlainLanguageViewProps {
  billId: string;
}

export function PlainLanguageView({ billId }: PlainLanguageViewProps) {
  const [viewMode, setViewMode] = useState<'plain' | 'legal' | 'side-by-side'>('plain');
  const [selectedClause, setSelectedClause] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<TranslationResponse>({
    queryKey: ['bill-translation', billId],
    queryFn: async () => {
      const response = await api.post(`/api/bills/${billId}/translate`, {
        fullBill: true
      });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Translating bill to plain language...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Translation Not Available Yet
        </h3>
        <p className="text-yellow-800">
          Plain-language translation for this bill is not available yet. We're working on translating all bills.
          In the meantime, you can read the full legal text in the "Full Text" tab.
        </p>
      </div>
    );
  }

  const translations: ClauseTranslation[] = data.translations || [];

  return (
    <div className="space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Plain-Language Translation</h2>
            <p className="text-gray-600 mt-1">
              Understanding the bill in simple terms
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('plain')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'plain'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Plain Language
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('legal')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'legal'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Legal Text
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 font-medium">{data.summary}</p>
          <p className="text-sm text-blue-700 mt-2">
            {data.translatedClauses} of {data.totalClauses} clauses translated
          </p>
        </div>
      </div>

      {/* Translations */}
      <div className="space-y-4">
        {translations.map((translation, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Clause Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <h3 className="font-semibold text-gray-900">{translation.clauseRef}</h3>
            </div>

            {/* Content based on view mode */}
            <div className="p-6">
              {viewMode === 'plain' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">What This Means:</h4>
                    <p className="text-lg text-gray-900 leading-relaxed">
                      {translation.plainLanguage}
                    </p>
                  </div>

                  {translation.keyPoints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
                      <ul className="space-y-2">
                        {translation.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-1">•</span>
                            <span className="text-gray-800">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {translation.examples.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Examples:</h4>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                        {translation.examples.map((example, i) => (
                          <p key={i} className="text-amber-900">
                            <span className="font-medium">→</span> {example}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {translation.affectedGroups.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Who's Affected:</h4>
                      <div className="flex flex-wrap gap-2">
                        {translation.affectedGroups.map((group, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                          >
                            {group}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'legal' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Legal Text:</h4>
                  <p className="text-gray-800 leading-relaxed font-serif">
                    {translation.originalText}
                  </p>
                </div>
              )}

              {viewMode === 'side-by-side' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Legal Text:</h4>
                    <p className="text-sm text-gray-800 leading-relaxed font-serif">
                      {translation.originalText}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Plain Language:</h4>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {translation.plainLanguage}
                    </p>
                    {translation.examples.length > 0 && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3">
                        <p className="text-xs font-medium text-amber-900 mb-1">Examples:</p>
                        {translation.examples.map((ex, i) => (
                          <p key={i} className="text-xs text-amber-800">→ {ex}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">💡 How to Use This Translation</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Read the plain-language version to understand what the bill does</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Check the examples to see how it affects you personally</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Use the "Calculate Impact" feature to see your specific costs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Compare with the legal text if you want to verify accuracy</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
