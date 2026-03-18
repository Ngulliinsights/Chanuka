/**
 * Metadata Comparison Component
 *
 * Displays bill metadata side-by-side in a comparison table.
 */

import type { Bill } from '@client/lib/types/bill';
import { AlertCircle } from 'lucide-react';

interface MetadataComparisonProps {
  bills: Bill[];
}

export function MetadataComparison({ bills }: MetadataComparisonProps) {
  const fields: Array<{ key: string; label: string; format?: (value: any) => string }> = [
    { key: 'bill_number', label: 'Bill Number' },
    { key: 'status', label: 'Status' },
    { key: 'chamber', label: 'Chamber' },
    { key: 'category', label: 'Category' },
    {
      key: 'introduced_date',
      label: 'Introduced',
      format: v => (v ? new Date(v).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'last_action_date',
      label: 'Last Action',
      format: v => (v ? new Date(v).toLocaleDateString() : 'N/A'),
    },
    { key: 'reading_stage', label: 'Reading Stage' },
    { key: 'priority_level', label: 'Priority' },
    { key: 'is_urgent', label: 'Urgent', format: v => (v ? 'Yes' : 'No') },
    { key: 'is_money_bill', label: 'Money Bill', format: v => (v ? 'Yes' : 'No') },
    {
      key: 'is_constitutional_amendment',
      label: 'Constitutional Amendment',
      format: v => (v ? 'Yes' : 'No'),
    },
  ];

  const getValue = (bill: Bill, key: string, format?: (value: any) => string) => {
    const value = (bill as any)[key];
    if (format) return format(value);
    return value?.toString() || 'N/A';
  };

  const isDifferent = (key: string) => {
    const values = bills.map(bill => (bill as any)[key]);
    const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
    return uniqueValues.size > 1;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="text-left p-3 font-medium text-sm border-b border-gray-200 dark:border-gray-700">
              Field
            </th>
            {bills.map((bill, index) => (
              <th
                key={bill.id}
                className="text-left p-3 font-medium text-sm border-b border-gray-200 dark:border-gray-700"
              >
                Bill {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map(({ key, label, format }) => {
            const different = isDifferent(key);

            return (
              <tr
                key={key}
                className={`border-b border-gray-200 dark:border-gray-700 ${
                  different ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                }`}
              >
                <td className="p-3 font-medium text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    {label}
                    {different && (
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                </td>
                {bills.map(bill => (
                  <td key={bill.id} className="p-3 text-sm">
                    {getValue(bill, key, format)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
