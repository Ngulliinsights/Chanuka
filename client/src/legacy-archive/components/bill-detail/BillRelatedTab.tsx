import { FileText, Link, ChevronRight, Clock } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

/**
 * BillRelatedTab - Related bills and cross-references
 */
function BillRelatedTab() {
  // Mock related bills data
  const mockRelatedBills = [
    {
      id: 2,
      billNumber: 'HB-2024-002',
      title: 'Healthcare Infrastructure Modernization Act',
      status: 'committee',
      relationship: 'companion',
      similarity: 85
    },
    {
      id: 3,
      billNumber: 'SB-2023-156',
      title: 'Rural Healthcare Access Initiative',
      status: 'passed',
      relationship: 'similar',
      similarity: 72
    },
    {
      id: 4,
      billNumber: 'HB-2023-089',
      title: 'Medical Coverage Expansion Act',
      status: 'failed',
      relationship: 'predecessor',
      similarity: 68
    }
  ];

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'companion':
        return 'hsl(var(--civic-expert))';
      case 'similar':
        return 'hsl(var(--civic-community))';
      case 'predecessor':
        return 'hsl(var(--civic-constitutional))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'companion':
        return 'Companion Bill';
      case 'similar':
        return 'Similar Legislation';
      case 'predecessor':
        return 'Previous Version';
      default:
        return 'Related';
    }
  };

  return (
    <div className="space-y-6">
      {/* Related Bills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" style={{ color: 'hsl(var(--civic-expert))' }} />
            Related Bills
          </CardTitle>
          <CardDescription>
            Similar and companion legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockRelatedBills.map((relatedBill) => (
              <div key={relatedBill.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{relatedBill.title}</h3>
                      <Badge 
                        variant="outline"
                        style={{ 
                          backgroundColor: getRelationshipColor(relatedBill.relationship),
                          color: 'white',
                          borderColor: getRelationshipColor(relatedBill.relationship)
                        }}
                      >
                        {getRelationshipLabel(relatedBill.relationship)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="font-medium">{relatedBill.billNumber}</span>
                      <Badge variant="outline">
                        {relatedBill.status}
                      </Badge>
                      <span>{relatedBill.similarity}% similar</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    View Bill
                  </Button>
                </div>
                
                {/* Similarity indicator */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${relatedBill.similarity}%`,
                      backgroundColor: getRelationshipColor(relatedBill.relationship)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historical Precedents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: 'hsl(var(--civic-constitutional))' }} />
            Historical Precedents
          </CardTitle>
          <CardDescription>
            Previous legislation on similar topics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📚 Historical Analysis Coming Soon
            </h3>
            <p className="text-gray-700 mb-4">
              Historical precedent analysis, outcome tracking, and legislative 
              pattern recognition will be implemented in future development phases.
            </p>
            <div className="text-sm text-gray-600">
              <strong>Planned Features:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Historical outcome analysis</li>
                <li>Legislative pattern recognition</li>
                <li>Success rate predictions</li>
                <li>Amendment history tracking</li>
                <li>Cross-state comparison</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cross-References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: 'hsl(var(--civic-community))' }} />
            Cross-References
          </CardTitle>
          <CardDescription>
            References to other laws and regulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">Affordable Care Act (ACA)</div>
              <div className="text-sm text-muted-foreground">
                Section 1332 - State Innovation Waivers
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">Social Security Act</div>
              <div className="text-sm text-muted-foreground">
                Title XIX - Medicaid Program
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">Public Health Service Act</div>
              <div className="text-sm text-muted-foreground">
                Section 330 - Health Centers Program
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Legislative Impact Network</CardTitle>
          <CardDescription>
            How this bill connects to the broader legislative landscape
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 bg-muted/30 rounded-lg border-2 border-dashed">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Impact Visualization</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Interactive network visualization showing connections between bills, 
              amendments, and related legislation will be available soon.
            </p>
            <Button variant="outline" disabled>
              View Network Graph
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillRelatedTab;