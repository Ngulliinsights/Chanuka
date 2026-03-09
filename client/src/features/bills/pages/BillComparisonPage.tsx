/**
 * Bill Comparison Page
 * 
 * Main page for comparing multiple bills side-by-side.
 * Supports text comparison, metadata comparison, and analysis comparison.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Share2, BarChart3, FileText, Info } from 'lucide-react';
import { useBillComparison } from '../hooks/useBillComparison';
import { BillSelector } from '../ui/comparison/BillSelector';
import { MetadataComparison } from '../ui/comparison/MetadataComparison';
import { TextDiff } from '../ui/comparison/TextDiff';
import { Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { LoadingStates } from '@client/lib/ui/loading/LoadingStates';

export default function BillComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  // Initialize from URL params
  useEffect(() => {
    const billsParam = searchParams.get('bills');
    if (billsParam) {
      const ids = billsParam.split(',').filter(Boolean);
      setSelectedBillIds(ids);
    }
  }, []);

  // Update URL when selection changes
  useEffect(() => {
    if (selectedBillIds.length > 0) {
      setSearchParams({ bills: selectedBillIds.join(',') });
    } else {
      setSearchParams({});
    }
  }, [selectedBillIds, setSearchParams]);

  const { bills, isLoading, error, differences } = useBillComparison({
    billIds: selectedBillIds,
    enabled: selectedBillIds.length >= 2,
  });

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
    alert('Comparison link copied to clipboard!');
  };

  const handleExport = () => {
    // TODO: Implement PDF export
    alert('Export functionality coming soon!');
  };

  const canCompare = selectedBillIds.length >= 2;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-8 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <Link
            to={searchParams.get('from') === 'bills' ? '/bills' : '/analysis'}
            className="inline-flex items-center text-sm text-blue-100 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {searchParams.get('from') === 'bills' ? 'Back to Bills' : 'Back to Analysis Tools'}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Bill Comparison</h1>
          <p className="text-blue-100">
            Compare bills side-by-side to understand differences and similarities
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Bill Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <BillSelector
                  selectedBillIds={selectedBillIds}
                  onBillsSelected={setSelectedBillIds}
                  maxBills={4}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {canCompare && bills.length >= 2 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Comparison Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Text Similarity</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {differences.textSimilarity}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Common Keywords</div>
                    <div className="text-sm font-medium">
                      {differences.commonKeywords.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Metadata Differences</div>
                    <div className="text-sm font-medium">
                      {differences.metadata.filter(d => d.isDifferent).length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Comparison View */}
          <div className="lg:col-span-3">
            {!canCompare ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Select Bills to Compare</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Choose at least 2 bills from the sidebar to start comparing
                  </p>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <LoadingStates.PageLoading message="Loading bills for comparison..." />
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-red-500 mb-2">Error loading bills</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {error.message}
                  </p>
                </CardContent>
              </Card>
            ) : bills.length >= 2 ? (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                {/* Bill Titles */}
                <div className="grid md:grid-cols-2 gap-4">
                  {bills.map((bill, index) => (
                    <Card key={bill.id}>
                      <CardContent className="p-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Bill {index + 1}
                        </div>
                        <h3 className="font-semibold mb-2">{bill.bill_number}</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {bill.title}
                        </p>
                        <Link
                          to={`/bills/${bill.id}`}
                          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                        >
                          View Full Bill →
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Comparison Tabs */}
                <Tabs defaultValue="metadata" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="metadata">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Metadata
                    </TabsTrigger>
                    <TabsTrigger value="text">
                      <FileText className="w-4 h-4 mr-2" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="summary">
                      <Info className="w-4 h-4 mr-2" />
                      Summary
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="metadata" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Metadata Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MetadataComparison bills={bills} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="text" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Text Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {bills.length === 2 ? (
                          <div className="space-y-6">
                            <div>
                              <h4 className="font-medium mb-3">Title</h4>
                              <TextDiff
                                text1={bills[0]?.title || ''}
                                text2={bills[1]?.title || ''}
                                label1={bills[0]?.bill_number || 'Bill 1'}
                                label2={bills[1]?.bill_number || 'Bill 2'}
                              />
                            </div>
                            {bills[0]?.summary && bills[1]?.summary && (
                              <div>
                                <h4 className="font-medium mb-3">Summary</h4>
                                <TextDiff
                                  text1={bills[0]?.summary || ''}
                                  text2={bills[1]?.summary || ''}
                                  label1={bills[0]?.bill_number || 'Bill 1'}
                                  label2={bills[1]?.bill_number || 'Bill 2'}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                            Text comparison is only available for 2 bills at a time.
                            <br />
                            Please select exactly 2 bills to see detailed text differences.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="summary" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Comparison Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Similarity Score */}
                        <div>
                          <h4 className="font-medium mb-2">Overall Similarity</h4>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                              <div
                                className="bg-blue-600 h-4 rounded-full transition-all"
                                style={{ width: `${differences.textSimilarity}%` }}
                              />
                            </div>
                            <span className="text-2xl font-bold text-blue-600">
                              {differences.textSimilarity}%
                            </span>
                          </div>
                        </div>

                        {/* Common Keywords */}
                        {differences.commonKeywords.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Common Keywords</h4>
                            <div className="flex flex-wrap gap-2">
                              {differences.commonKeywords.map((keyword, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Unique Keywords */}
                        <div>
                          <h4 className="font-medium mb-3">Unique Keywords</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            {bills.map((bill, index) => {
                              const uniqueKeywords = differences.uniqueKeywords[`bill${index + 1}`] || [];
                              return (
                                <div key={bill.id}>
                                  <div className="text-sm font-medium mb-2">{bill.bill_number}</div>
                                  <div className="flex flex-wrap gap-2">
                                    {uniqueKeywords.slice(0, 5).map((keyword, kwIndex) => (
                                      <span
                                        key={kwIndex}
                                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Key Differences */}
                        <div>
                          <h4 className="font-medium mb-2">Key Differences</h4>
                          <ul className="space-y-2">
                            {differences.metadata
                              .filter(d => d.isDifferent)
                              .slice(0, 5)
                              .map((diff, index) => (
                                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium">{diff.label}:</span>{' '}
                                  {Object.entries(diff.values).map(([key, value], i, arr) => (
                                    <span key={key}>
                                      {value?.toString() || 'N/A'}
                                      {i < arr.length - 1 ? ' vs ' : ''}
                                    </span>
                                  ))}
                                </li>
                              ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
