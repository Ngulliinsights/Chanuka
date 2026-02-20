import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@client/services/apiService';
import type { PersonalImpact, UserContext } from '@shared/types/bills/translation.types';

interface ImpactCalculatorProps {
  billId: string;
}

type UserInput = UserContext;

export function ImpactCalculator({ billId }: ImpactCalculatorProps) {
  const [userInput, setUserInput] = useState<UserInput>({
    useMobileMoney: true,
    useOnlineServices: true,
    isEmployed: true
  });
  const [showResults, setShowResults] = useState(false);

  const { mutate: calculateImpact, data: impact, isLoading } = useMutation<PersonalImpact, Error, UserInput>({
    mutationFn: async (input: UserInput) => {
      const response = await api.post(`/api/bills/${billId}/calculate-impact`, input);
      return response.data;
    },
    onSuccess: () => {
      setShowResults(true);
    }
  });

  const handleCalculate = () => {
    calculateImpact(userInput);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-900 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default: return 'bg-green-100 text-green-900 border-green-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Impact Calculator</h2>
        <p className="text-gray-600">
          Tell us about yourself to see how this bill affects you personally
        </p>
      </div>

      {/* Input Form */}
      {!showResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Monthly Income */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Income (KES) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInput.monthlyIncome || ''}
                onChange={(e) => setUserInput({ ...userInput, monthlyIncome: Number(e.target.value) })}
                placeholder="e.g., 50000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your gross monthly income before deductions
              </p>
            </div>

            {/* County */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County
              </label>
              <select
                value={userInput.county || ''}
                onChange={(e) => setUserInput({ ...userInput, county: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select your county</option>
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kisumu">Kisumu</option>
                <option value="Nakuru">Nakuru</option>
                <option value="Kiambu">Kiambu</option>
                {/* Add more counties */}
              </select>
            </div>

            {/* Household Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Household Size
              </label>
              <input
                type="number"
                value={userInput.householdSize || ''}
                onChange={(e) => setUserInput({ ...userInput, householdSize: Number(e.target.value) })}
                placeholder="e.g., 4"
                min="1"
                max="20"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Usage Patterns */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Your Usage Patterns
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={userInput.useMobileMoney}
                  onChange={(e) => setUserInput({ ...userInput, useMobileMoney: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">I use mobile money (M-Pesa, Airtel Money, etc.)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={userInput.useOnlineServices}
                  onChange={(e) => setUserInput({ ...userInput, useOnlineServices: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">I use online services (Jumia, Uber, food delivery, etc.)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={userInput.isEmployed}
                  onChange={(e) => setUserInput({ ...userInput, isEmployed: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">I am formally employed (receive a salary)</span>
              </label>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={!userInput.monthlyIncome || isLoading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Calculating...' : 'Calculate My Impact'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && impact && (
        <div className="space-y-4">
          {/* Impact Summary */}
          <div className={`rounded-lg border-2 p-6 ${getSeverityColor(impact.severity)}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Your Personal Impact</h3>
                <p className="text-sm opacity-90">{impact.personalizedMessage}</p>
              </div>
              <span className="px-3 py-1 bg-white bg-opacity-50 rounded-full text-sm font-medium uppercase">
                {impact.severity} Impact
              </span>
            </div>

            {/* Financial Impact */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <p className="text-sm opacity-75 mb-1">Monthly Cost</p>
                <p className="text-3xl font-bold">
                  KES {impact.financialImpact.monthly.toLocaleString()}
                </p>
              </div>
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <p className="text-sm opacity-75 mb-1">Annual Cost</p>
                <p className="text-3xl font-bold">
                  KES {impact.financialImpact.annual.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {impact.financialImpact.breakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
              <div className="space-y-3">
                {impact.financialImpact.breakdown.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.provision}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.explanation}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.clauseRef}</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 ml-4">
                        KES {item.amount.toLocaleString()}/year
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected Services */}
          {impact.affectedServices.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Services Affected</h4>
              <div className="flex flex-wrap gap-2">
                {impact.affectedServices.map((service, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {impact.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3">What You Can Do</h4>
              <ul className="space-y-2">
                {impact.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-800">
                    <span className="text-blue-600 font-bold mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recalculate Button */}
          <button
            onClick={() => setShowResults(false)}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Recalculate with Different Information
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          <strong>Disclaimer:</strong> This calculator provides estimates based on typical usage patterns.
          Your actual impact may vary. Calculations are conservative and based on available data.
          Confidence level: {impact?.confidence || 'N/A'}.
        </p>
      </div>
    </div>
  );
}
