import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FileText, Download, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Bill } from '../../store/slices/billsSlice';

interface BillFullTextTabProps {
  bill: Bill;
}

/**
 * BillFullTextTab - Full legislative text with search and navigation
 */
function BillFullTextTab({ bill }: BillFullTextTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: 'hsl(var(--civic-expert))' }} />
            Full Legislative Text
          </CardTitle>
          <CardDescription>
            Complete text of {bill.billNumber} with section navigation
          </CardDescription>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search Text
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                📄 Full Text Coming Soon
              </h3>
              <p className="text-blue-800 mb-4">
                The complete legislative text with section-by-section navigation, 
                search functionality, and downloadable formats will be implemented 
                in future development phases.
              </p>
              <div className="text-sm text-blue-700">
                <strong>Planned Features:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Section-by-section navigation</li>
                  <li>In-text search with highlighting</li>
                  <li>Downloadable PDF and plain text formats</li>
                  <li>Amendment tracking and comparison</li>
                  <li>Cross-references to related legislation</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillFullTextTab;