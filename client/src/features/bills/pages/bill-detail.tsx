import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

// Feature Imports
import { AnalysisDashboard } from '@client/features/analysis/ui/dashboard';
import { BillHeader, useBill } from '@client/features/bills';
import BillCommunityTab from '@client/features/bills/ui/detail/BillCommunityTab';
import BillFullTextTab from '@client/features/bills/ui/detail/BillFullTextTab';
import BillOverviewTab from '@client/features/bills/ui/detail/BillOverviewTab';
import BillSponsorsTab from '@client/features/bills/ui/detail/BillSponsorsTab';
import { ImplementationWorkarounds } from '@client/features/bills/ui/components/ImplementationWorkarounds';
import { BriefViewer } from '@client/features/bills/ui/legislative-brief';
import { ActionPromptCard } from '@client/features/bills/ui/action-prompts';
import { PlainLanguageView } from '@client/features/bills/ui/translation';
import { ImpactCalculator } from '@client/features/bills/ui/impact';
import { SimilarBillsWidget } from '@client/features/recommendation';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';
import { useQuery } from '@tanstack/react-query';
import { api } from '@client/services/apiService';

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize tab from URL or default to overview
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  // ✅ Use the React Query Hook (The Brain)
  const { data: bill, isLoading, isError, error } = useBill(id);

  // Fetch action prompts for this bill
  const { data: actionPrompts } = useQuery({
    queryKey: ['action-prompts', id],
    queryFn: async () => {
      const response = await api.get(`/api/bills/${id}/action-prompts`);
      return response.data;
    },
    enabled: !!id,
  });

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-muted-foreground">Loading bill details...</p>
      </div>
    );
  }

  // 2. Error State
  if (isError || !bill) {
    logger.error('Failed to load bill detail', { billId: id, error });
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>Failed to load bill. It may have been removed or you may have lost connection.</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/bills')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // 3. Success State
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <Button
        variant="ghost"
        className="pl-0 hover:bg-transparent hover:text-blue-600"
        onClick={() => navigate('/bills')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Legislation
      </Button>

      {/* Header Section */}
      <BillHeader bill={bill} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10 h-auto">
          <TabsTrigger value="overview" className="py-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="plain-language" className="py-3">
            📖 Plain Language
          </TabsTrigger>
          <TabsTrigger value="impact" className="py-3">
            💰 My Impact
          </TabsTrigger>
          <TabsTrigger value="actions" className="py-3">
            🎯 Actions
          </TabsTrigger>
          <TabsTrigger value="brief" className="py-3">
            📄 Brief
          </TabsTrigger>
          <TabsTrigger value="text" className="py-3">
            Full Text
          </TabsTrigger>
          <TabsTrigger value="sponsors" className="py-3">
            Sponsors
          </TabsTrigger>
          <TabsTrigger value="analysis" className="py-3">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="workarounds" className="py-3">
            Workarounds
          </TabsTrigger>
          <TabsTrigger value="community" className="py-3">
            Community
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <BillOverviewTab bill={bill} />
        </TabsContent>

        <TabsContent value="plain-language" className="space-y-4">
          <PlainLanguageView billId={bill.id} />
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <ImpactCalculator billId={bill.id} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Take Action</h2>
            <p className="text-gray-600 mb-6">
              Here are the actions you can take right now to engage with this bill.
            </p>
            {actionPrompts && actionPrompts.length > 0 ? (
              <div className="space-y-4">
                {actionPrompts.map((prompt: any, idx: number) => (
                  <ActionPromptCard key={idx} prompt={prompt} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No actions available at this time.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="brief" className="space-y-4">
          <BriefViewer billId={bill.id} />
        </TabsContent>

        <TabsContent value="text">
          <BillFullTextTab bill={bill} />
        </TabsContent>

        <TabsContent value="sponsors">
          <BillSponsorsTab bill={bill} />
        </TabsContent>

        <TabsContent value="analysis">
          <AnalysisDashboard bill={bill} />
        </TabsContent>

        <TabsContent value="workarounds">
          <ImplementationWorkarounds bill_id={bill.id} />
        </TabsContent>

        <TabsContent value="community">
          <BillCommunityTab bill={bill} />
        </TabsContent>
      </Tabs>

      {/* Similar Bills Widget */}
      <div className="mt-8">
        <SimilarBillsWidget billId={bill.id} limit={5} />
      </div>
    </div>
  );
}
