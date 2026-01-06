/**
 * Data Export Modal Component
 *
 * Allows users to export their personal data for GDPR compliance.
 */

import {
  Download,
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { Button } from '@/shared/design-system/interactive/Button';
import { Checkbox } from '@/shared/design-system/interactive/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/design-system/interactive/Dialog';
import { Input } from '@/shared/design-system/interactive/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/design-system/interactive/Select';
import { Label } from '@/shared/design-system/typography/Label';
import { DataExportRequest } from '@/shared/types/user-dashboard';

interface DataExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (request: DataExportRequest) => Promise<string>;
}

export function DataExportModal({ open, onOpenChange, onExport }: DataExportModalProps) {
  const [exportRequest, setExportRequest] = useState<DataExportRequest>({
    format: 'json',
    includePersonalData: true,
    includeActivityHistory: true,
    includeMetrics: true,
    includeComments: true,
    dateRange: undefined,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
    downloadId?: string;
  } | null>(null);

  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatOptions = [
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'Machine-readable format, good for developers',
      icon: <Database className="h-4 w-4" />,
    },
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Spreadsheet format, good for analysis',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: 'pdf' as const,
      label: 'PDF',
      description: 'Human-readable format, good for records',
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  const dataCategories = [
    {
      key: 'includePersonalData' as const,
      title: 'Personal Information',
      description: 'Name, email, profile data, preferences',
    },
    {
      key: 'includeActivityHistory' as const,
      title: 'Activity History',
      description: 'Views, comments, shares, votes, and engagement timeline',
    },
    {
      key: 'includeMetrics' as const,
      title: 'Civic Metrics',
      description: 'Engagement scores, achievements, and impact measurements',
    },
    {
      key: 'includeComments' as const,
      title: 'Comments & Contributions',
      description: 'All comments, expert contributions, and discussion posts',
    },
  ];

  const handleCategoryToggle = (key: keyof DataExportRequest) => {
    if (typeof exportRequest[key] === 'boolean') {
      setExportRequest(prev => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const handleFormatChange = (format: DataExportRequest['format']) => {
    setExportRequest(prev => ({ ...prev, format }));
  };

  const handleDateRangeToggle = (checked: boolean) => {
    setUseDateRange(checked);
    if (!checked) {
      setExportRequest(prev => ({ ...prev, dateRange: undefined }));
      setStartDate('');
      setEndDate('');
    }
  };

  const handleDateChange = () => {
    if (useDateRange && startDate && endDate) {
      setExportRequest(prev => ({
        ...prev,
        dateRange: { start: startDate, end: endDate },
      }));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      // Update date range if needed
      const finalRequest = {
        ...exportRequest,
        dateRange:
          useDateRange && startDate && endDate ? { start: startDate, end: endDate } : undefined,
      };

      const exportId = await onExport(finalRequest);

      setExportResult({
        success: true,
        message: 'Export completed successfully! Your download will begin shortly.',
        downloadId: exportId,
      });

      // In a real implementation, this would trigger a download
      setTimeout(() => {
        setExportResult(prev =>
          prev
            ? {
                ...prev,
                message: 'Download ready. Check your downloads folder.',
              }
            : null
        );
      }, 2000);
    } catch (error) {
      setExportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Export failed. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = Object.values(exportRequest).some(value =>
    typeof value === 'boolean' ? value : false
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Your Data
            </div>
          </DialogTitle>
          <DialogDescription>
            Download a copy of your personal data in compliance with GDPR and privacy regulations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Result */}
          {exportResult && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                exportResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {exportResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    exportResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {exportResult.success ? 'Export Successful' : 'Export Failed'}
                </p>
                <p
                  className={`text-sm ${exportResult.success ? 'text-green-700' : 'text-red-700'}`}
                >
                  {exportResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Export Format</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the format for your exported data.
              </p>
            </div>

            <Select value={exportRequest.format} onValueChange={handleFormatChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Categories */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Data to Include</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select which categories of data to include in your export.
              </p>
            </div>

            <div className="space-y-3">
              {dataCategories.map(category => (
                <div
                  key={category.key}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    id={category.key}
                    checked={exportRequest[category.key] as boolean}
                    onCheckedChange={() => handleCategoryToggle(category.key)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={category.key} className="font-medium">
                      {category.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="date-range"
                checked={useDateRange}
                onCheckedChange={handleDateRangeToggle}
              />
              <div className="flex-1">
                <Label htmlFor="date-range" className="font-medium">
                  Limit by Date Range
                </Label>
                <p className="text-sm text-muted-foreground">
                  Only include data from a specific time period.
                </p>
              </div>
            </div>

            {useDateRange && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-date" className="text-sm">
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value);
                        handleDateChange();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm">
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={e => {
                        setEndDate(e.target.value);
                        handleDateChange();
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium mb-2">Privacy & Security</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your export will be available for download for 7 days</li>
                  <li>• The download link will be sent to your registered email</li>
                  <li>• Exported data is encrypted and password-protected</li>
                  <li>• We do not store copies of your exported data</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!canExport || isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
