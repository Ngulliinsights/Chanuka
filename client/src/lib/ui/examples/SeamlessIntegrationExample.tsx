/**
 * Seamless Integration Example Component
 *
 * Demonstrates how to use the seamless integration system
 * with progressive enhancement and graceful fallbacks.
 */

import { useState } from 'react';
import React from 'react';

import {
  useValidation,
  useFormatting,
  useStrings,
  useArrays,
  useCivic,
  useAnonymity,
  useProgressiveEnhancement,
  useIntegrationStatus,
} from '@client/lib/hooks/use-seamless-integration';

interface ExampleFormData {
  email: string;
  phone: string;
  billNumber: string;
  amount: number;
  title: string;
}

export function SeamlessIntegrationExample() {
  const [formData, setFormData] = useState<ExampleFormData>({
    email: '',
    phone: '',
    billNumber: '',
    amount: 0,
    title: '',
  });

  // Use seamless integration hooks
  const validation = useValidation();
  const formatting = useFormatting();
  const strings = useStrings();
  const arrays = useArrays();
  const civic = useCivic();
  const anonymity = useAnonymity();
  const { enhancementLevel, shouldEnableFeature } = useProgressiveEnhancement();
  const { diagnostics } = useIntegrationStatus();

  // Form validation
  const isEmailValid = validation.email(formData.email);
  const isPhoneValid = validation.phone(formData.phone);
  const isBillNumberValid = validation.billNumber(formData.billNumber);

  // Formatting examples
  const formattedAmount = formatting.currency(formData.amount);
  const formattedDate = formatting.date(new Date());
  const relativeTime = formatting.relativeTime(new Date(Date.now() - 86400000)); // Yesterday

  // String manipulation examples
  const slugTitle = strings.slugify(formData.title);
  const truncatedTitle = strings.truncate(formData.title, 20);
  const titleCaseTitle = strings.titleCase(formData.title);

  // Array manipulation examples
  const sampleData = [1, 2, 2, 3, 3, 3, 4];
  const uniqueData = arrays.unique(sampleData);
  const chunkedData = arrays.chunk(sampleData, 3);

  // Civic utilities examples
  const urgencyScore = civic.calculateUrgencyScore();
  const engagementSummary = civic.generateEngagementSummary();

  // Anonymity examples
  const anonymousId = anonymity.generateId();
  const pseudonymSuggestions = anonymity.generatePseudonymSuggestions(3);

  const handleInputChange = (field: keyof ExampleFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Seamless Integration Example</h1>

        {/* Integration Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Enhancement Level:</span>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  enhancementLevel === 'enhanced'
                    ? 'bg-green-100 text-green-800'
                    : enhancementLevel === 'basic'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {enhancementLevel}
              </span>
            </div>
            <div>
              <span className="font-medium">Shared Modules:</span>
              <span
                className={`ml-2 ${diagnostics.canUseSharedModules ? 'text-green-600' : 'text-yellow-600'}`}
              >
                {diagnostics.canUseSharedModules ? 'Available' : 'Fallback Mode'}
              </span>
            </div>
            <div>
              <span className="font-medium">Health:</span>
              <span
                className={`ml-2 ${diagnostics.integrationHealth === 'healthy' ? 'text-green-600' : 'text-red-600'}`}
              >
                {diagnostics.integrationHealth}
              </span>
            </div>
          </div>
        </div>

        {/* Form Example */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">Form with Validation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    formData.email && !isEmailValid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {formData.email && !isEmailValid && (
                  <p className="text-red-500 text-sm mt-1">Invalid email format</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kenya Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    formData.phone && !isPhoneValid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+254 or 07xx xxx xxx"
                />
                {formData.phone && !isPhoneValid && (
                  <p className="text-red-500 text-sm mt-1">Invalid Kenya phone number</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={formData.billNumber}
                  onChange={e => handleInputChange('billNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    formData.billNumber && !isBillNumberValid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., HB 123/2024"
                />
                {formData.billNumber && !isBillNumberValid && (
                  <p className="text-red-500 text-sm mt-1">Invalid bill number format</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">Formatted: {formattedAmount}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter a title"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Live Examples</h2>
            <div className="space-y-4">
              {/* Formatting Examples */}
              <div className="p-3 bg-blue-50 rounded">
                <h3 className="font-medium text-blue-900 mb-2">Formatting</h3>
                <div className="text-sm space-y-1">
                  <div>Today: {formattedDate}</div>
                  <div>Yesterday: {relativeTime}</div>
                  <div>Amount: {formattedAmount}</div>
                </div>
              </div>

              {/* String Manipulation */}
              {formData.title && (
                <div className="p-3 bg-green-50 rounded">
                  <h3 className="font-medium text-green-900 mb-2">String Manipulation</h3>
                  <div className="text-sm space-y-1">
                    <div>Slug: {slugTitle}</div>
                    <div>Truncated: {truncatedTitle}</div>
                    <div>Title Case: {titleCaseTitle}</div>
                  </div>
                </div>
              )}

              {/* Array Operations */}
              <div className="p-3 bg-purple-50 rounded">
                <h3 className="font-medium text-purple-900 mb-2">Array Operations</h3>
                <div className="text-sm space-y-1">
                  <div>Original: [{sampleData.join(', ')}]</div>
                  <div>Unique: [{uniqueData.join(', ')}]</div>
                  <div>Chunked: {JSON.stringify(chunkedData)}</div>
                </div>
              </div>

              {/* Civic Utilities */}
              {shouldEnableFeature('civic-scoring') ? (
                <div className="p-3 bg-orange-50 rounded">
                  <h3 className="font-medium text-orange-900 mb-2">Civic Utilities</h3>
                  <div className="text-sm space-y-1">
                    <div>Urgency Score: {urgencyScore}/100</div>
                    <div>Summary: {engagementSummary}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-medium text-gray-700 mb-2">Civic Utilities</h3>
                  <p className="text-sm text-gray-600">
                    Enhanced civic features require shared modules
                  </p>
                </div>
              )}

              {/* Anonymity Features */}
              {shouldEnableFeature('anonymity-management') ? (
                <div className="p-3 bg-red-50 rounded">
                  <h3 className="font-medium text-red-900 mb-2">Anonymity Features</h3>
                  <div className="text-sm space-y-1">
                    <div>Anonymous ID: {anonymousId}</div>
                    <div>Pseudonyms: {pseudonymSuggestions.join(', ')}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-medium text-gray-700 mb-2">Anonymity Features</h3>
                  <p className="text-sm text-gray-600">
                    Enhanced anonymity features require shared modules
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {diagnostics.recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">Recommendations</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              {diagnostics.recommendations.map((rec: string, index: number) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeamlessIntegrationExample;
