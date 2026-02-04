import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Feature Imports
import { AnalysisDashboard } from '@client/features/analysis/ui/dashboard';
import { BillHeader, useBill } from '@client/features/bills';
import BillCommunityTab from '@client/features/bills/ui/detail/BillCommunityTab';
import BillFullTextTab from '@client/features/bills/ui/detail/BillFullTextTab';
import BillOverviewTab from '@client/features/bills/ui/detail/BillOverviewTab';
import BillSponsorsTab from '@client/features/bills/ui/detail/BillSponsorsTab';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // ✅ Use the React Query Hook (The Brain)
  const { data: bill, isLoading, isError, error } = useBill(id);

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="py-3">
            Overview
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
          <TabsTrigger value="community" className="py-3">
            Community
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <BillOverviewTab bill={bill} />
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

        <TabsContent value="community">
          <BillCommunityTab bill={bill} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
