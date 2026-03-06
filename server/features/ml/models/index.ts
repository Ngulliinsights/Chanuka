/**
 * MWANGA Stack ML Models
 * Main export file for all analyzers
 */

// Base classes and types
export { BaseAnalyzer } from './base-analyzer';
export type { AnalyzerConfig } from './base-analyzer';
export * from './types';

// Analyzers
export { SentimentAnalyzer, sentimentAnalyzer } from './sentiment-analyzer';
export { ConstitutionalAnalyzer, constitutionalAnalyzer } from './constitutional-analyzer';
export { TrojanBillDetector, trojanBillDetector } from './trojan-bill-detector';
export { ConflictDetector, conflictDetector } from './conflict-detector';
export { 
  EngagementPredictor, 
  engagementPredictor,
  trainEngagementModel,
  shouldRetrainEngagementModel,
} from './engagement-predictor';
export { 
  ElectoralAccountabilityAnalyzer, 
  electoralAccountabilityAnalyzer 
} from './electoral-accountability-analyzer';
export { 
  InfluenceNetworkAnalyzer, 
  influenceNetworkAnalyzer 
} from './influence-network-analyzer';
export { 
  ContentClassifier, 
  contentClassifier 
} from './content-classifier';
export { 
  TransparencyAnalyzer, 
  transparencyAnalyzer 
} from './transparency-analyzer';
export { 
  BillSummarizer, 
  billSummarizer 
} from './bill-summarizer';

/**
 * Convenience function to analyze sentiment
 */
export async function analyzeSentiment(text: string, context?: string) {
  return sentimentAnalyzer.analyze({ text, context });
}

/**
 * Convenience function to analyze trojan bill risk
 */
export async function analyzeTrojanBill(
  billId: number,
  billText: string,
  billTitle: string,
  metadata: {
    pageCount: number;
    consultationPeriodDays: number;
    amendmentCount: number;
    scheduleCount: number;
    urgencyDesignation?: string;
    submissionDate: Date;
  }
) {
  return trojanBillDetector.analyze({
    billId,
    billText,
    billTitle,
    metadata,
  });
}

/**
 * Convenience function to detect conflicts of interest
 */
export async function detectConflict(
  billId: number,
  sponsorId: number,
  billText?: string
) {
  return conflictDetector.analyze({ billId, sponsorId, billText });
}

/**
 * Convenience function to predict engagement
 */
export async function predictEngagement(
  userId: number,
  billId: number,
  timestamp?: Date
) {
  return engagementPredictor.analyze({ userId, billId, timestamp });
}

/**
 * Convenience function to analyze electoral accountability
 */
export async function analyzeElectoralAccountability(input: {
  sponsorId: number;
  sponsorName: string;
  constituency: string;
  county: string;
  billId: number;
  billTitle: string;
  mpVote: 'yes' | 'no' | 'abstain';
  voteDate: Date;
  constituentSupport: number;
  constituentOppose: number;
  constituentNeutral: number;
  sampleSize: number;
  confidenceLevel: number;
  daysUntilElection: number;
  previousElectionMargin?: number;
  mpHistoricalAlignment?: number;
  billUrgency?: 'routine' | 'normal' | 'urgent' | 'emergency';
}) {
  return electoralAccountabilityAnalyzer.analyze(input);
}

/**
 * Health check for all ML services
 */
export async function checkMLHealth(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
}> {
  const services: Record<string, boolean> = {
    sentiment: true,
    constitutional: true,
    trojanBill: true,
    conflict: true,
    engagement: true,
    electoralAccountability: true,
    influenceNetwork: true,
    contentClassifier: true,
    transparency: true,
    billSummarizer: true,
  };

  // TODO: Add actual health checks for external services
  // - Ollama connection
  // - ChromaDB connection
  // - HuggingFace API
  // - NetworkX graph availability
  // - Trained engagement model availability

  const healthy = Object.values(services).every((s) => s);

  return { healthy, services };
}

/**
 * Clear all analyzer caches
 */
export function clearAllCaches(): void {
  sentimentAnalyzer.clearCache();
  constitutionalAnalyzer.clearCache();
  trojanBillDetector.clearCache();
  conflictDetector.clearCache();
  engagementPredictor.clearCache();
  electoralAccountabilityAnalyzer.clearCache();
  influenceNetworkAnalyzer.clearCache();
  contentClassifier.clearCache();
  transparencyAnalyzer.clearCache();
  billSummarizer.clearCache();
}
