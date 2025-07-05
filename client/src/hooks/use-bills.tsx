import { useCallback, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Bill } from '@shared/types/bill';

interface ActionItem {
  id: number;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  billId?: number;
}

interface ActivitySummary {
  billsTracked: number;
  actionsNeeded: number;
  topicsCount: number;
}

// Use mock data when API calls return empty results (for preview purposes)
// This should be removed in production
const MOCK_BILLS: Bill[] = [
  {
    id: 1,
    title: "Finance Bill 2023",
    description: "A bill to provide for the imposition, alteration and regulation of certain taxes, duties and fees; to amend certain written laws relating to taxes, duties, fees and to make provisions of a financial nature in respect of certain public bodies.",
    status: "active",
    dateIntroduced: new Date("2023-04-12").toISOString(),
    sponsor: "Cabinet Secretary, Ministry of Finance",
    cosponsors: 5,
    supportPercentage: 46,
    views: 1249,
    shares: 358,
    analyses: 24,
    endorsements: 155,
    verifiedClaims: 12,
    createdAt: new Date("2023-04-12").toISOString(),
    updatedAt: new Date("2023-05-02").toISOString(),
    provisions: ["Tax code amendments", "Customs duty revisions", "Excise duty changes"],
  },
  {
    id: 2,
    title: "Data Protection (General) Regulations 2023",
    description: "Regulations to provide for the protection of personal data processed by public and private entities by regulating the collection, processing, storage, use and disclosure of personal data.",
    status: "upcoming",
    dateIntroduced: new Date("2023-05-20").toISOString(),
    sponsor: "Cabinet Secretary, Ministry of ICT",
    cosponsors: 3,
    supportPercentage: 72,
    views: 876,
    shares: 192,
    analyses: 14,
    endorsements: 89,
    verifiedClaims: 5,
    createdAt: new Date("2023-05-20").toISOString(),
    updatedAt: new Date("2023-05-25").toISOString(),
  },
  {
    id: 3,
    title: "Healthcare Improvement Act 2023",
    description: "An Act to improve healthcare access, affordability, and quality across Kenya by expanding insurance coverage, enhancing healthcare infrastructure, and fortifying the healthcare workforce.",
    status: "passed",
    dateIntroduced: new Date("2023-02-15").toISOString(),
    sponsor: "Cabinet Secretary, Ministry of Health",
    cosponsors: 8,
    supportPercentage: 89,
    views: 2304,
    shares: 745,
    analyses: 37,
    endorsements: 278,
    verifiedClaims: 23,
    createdAt: new Date("2023-02-15").toISOString(),
    updatedAt: new Date("2023-03-30").toISOString(),
  }
];

const MOCK_ACTION_ITEMS: ActionItem[] = [
  {
    id: 1,
    title: "Review Finance Bill amendments",
    description: "New changes were proposed to sections 12-15",
    priority: "High",
    billId: 1
  },
  {
    id: 2,
    title: "Finance Bill public hearing",
    description: "Scheduled for May 25th at the Parliamentary chambers",
    priority: "Medium",
    billId: 1
  }
];

const MOCK_TOPICS = ["Finance", "Taxation", "Healthcare", "Data Privacy", "Education"];

const MOCK_SUMMARY: ActivitySummary = {
  billsTracked: 8,
  actionsNeeded: 3,
  topicsCount: 5
};

export function useBills() {
  const [activeFilter, setActiveFilter] = useState<'active' | 'upcoming' | 'passed'>('active');

  // Fetch all bills
  const {
    data: billsFromApi = [],
    isLoading,
    error,
  } = useQuery<Bill[], Error>({
    queryKey: ['bills'],
    queryFn: async () => {
      const response = await fetch('/api/bills');
      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }
      return response.json();
    },
  });

  // Use mock data when API returns empty results
  const bills = billsFromApi.length > 0 ? billsFromApi : MOCK_BILLS;

  // Fetch a specific bill by ID
  const fetchBill = useCallback(async (id: number) => {
    return queryClient.fetchQuery({
      queryKey: ['bills', id],
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', `/api/bills/${id}`);
          const data = await res.json();
          return data || MOCK_BILLS.find(b => b.id === id);
        } catch (error) {
          // Return mock data if API call fails
          return MOCK_BILLS.find(b => b.id === id);
        }
      },
    });
  }, []);

  // Save a bill to user's tracked bills
  const saveBillMutation = useMutation({
    mutationFn: async (billId: number) => {
      const res = await apiRequest('POST', '/api/user/bills', { billId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'bills'] });
    },
  });

  // Share a bill 
  const shareBillMutation = useMutation({
    mutationFn: async ({ billId, platform }: { billId: number; platform: string }) => {
      const res = await apiRequest('POST', '/api/bills/share', { billId, platform });
      return res.json();
    },
    onSuccess: (_, { billId }) => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId] });
    },
  });

  // Filtered bills based on active filter
  const filteredBills = bills.filter((bill) => bill.status.toLowerCase() === activeFilter.toLowerCase());

  // Action items from the API
  const {
    data: apiActionItems = [],
  } = useQuery<ActionItem[], Error>({
    queryKey: ['user', 'actions'],
  });

  // Use mock action items if API returns empty
  const actionItems = apiActionItems.length > 0 ? apiActionItems : MOCK_ACTION_ITEMS;

  // Tracked topics from the API
  const {
    data: apiTrackedTopics = [],
  } = useQuery<string[], Error>({
    queryKey: ['user', 'topics'],
  });

  // Use mock topics if API returns empty
  const trackedTopics = apiTrackedTopics.length > 0 ? apiTrackedTopics : MOCK_TOPICS;

  // Activity summary from the API
  const {
    data: apiSummary,
  } = useQuery<ActivitySummary, Error>({
    queryKey: ['user', 'summary'],
  });

  // Use mock summary if API returns nothing
  const summary = apiSummary || MOCK_SUMMARY;

  return {
    bills,
    isLoading: false, // Force loading to false for preview
    error,
    fetchBill,
    fetchBills: setActiveFilter,
    saveBill: saveBillMutation.mutate,
    shareBill: shareBillMutation.mutate,
    activeBills: filteredBills,
    actionItems,
    trackedTopics,
    summary,
    bill: bills.find((b) => b.id === 1) || MOCK_BILLS[0], // Fallback to mock data
  };
}