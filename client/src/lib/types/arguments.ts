export interface ArgumentCluster {
  id: string;
  billId: string;
  title: string;
  summary: string;
  arguments: Argument[];
  stance: 'pro' | 'con' | 'neutral';
  confidence: number;
  size: number;
  keywords?: string[];
  createdAt: string;
}
