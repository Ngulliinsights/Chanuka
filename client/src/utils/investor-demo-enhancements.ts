/**
 * Investor Demo Enhancement Utilities
 *
 * Provides polished demo experiences that showcase platform capabilities
 * while maintaining authenticity and avoiding obvious mock data patterns.
 */

import { getDemoEngagementMetrics, filterDemoBills } from './demo-data-service';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  setup: () => void;
  highlights: string[];
}

/**
 * Pre-configured demo scenarios for different investor interests
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'civic-engagement',
    name: 'Civic Engagement Platform',
    description: 'Showcase community participation and democratic transparency features',
    setup: () => {
      // Configure filters to show high-engagement bills
      localStorage.setItem('demo-scenario', 'civic-engagement');
      localStorage.setItem(
        'demo-filters',
        JSON.stringify({
          status: ['committee', 'passed'],
          urgency: ['high', 'critical'],
        })
      );
    },
    highlights: [
      'Real-time community engagement metrics',
      'Expert verification and credibility scoring',
      'Constitutional analysis and workaround detection',
      'Personalized civic impact tracking',
    ],
  },
  {
    id: 'transparency-tech',
    name: 'Legislative Transparency Technology',
    description: 'Highlight AI-powered analysis and technical innovation',
    setup: () => {
      localStorage.setItem('demo-scenario', 'transparency-tech');
      localStorage.setItem(
        'demo-filters',
        JSON.stringify({
          policyAreas: ['technology', 'governance'],
          constitutionalFlags: true,
        })
      );
    },
    highlights: [
      'AI-powered workaround detection algorithms',
      'Natural language bill search and analysis',
      'Real-time legislative tracking and alerts',
      'Accessibility-first design (WCAG AAA compliance)',
    ],
  },
  {
    id: 'market-opportunity',
    name: 'Market Opportunity & Scale',
    description: 'Demonstrate user growth potential and monetization paths',
    setup: () => {
      localStorage.setItem('demo-scenario', 'market-opportunity');
      localStorage.setItem('demo-user-type', 'premium');
    },
    highlights: [
      'Growing user base with high engagement rates',
      'Premium features and subscription model',
      'API access for third-party integrations',
      'Government and NGO partnership opportunities',
    ],
  },
];

/**
 * Enhanced demo state management
 */
export class DemoStateManager {
  private static instance: DemoStateManager;
  private currentScenario: string | null = null;
  private demoMode: boolean = false;

  static getInstance(): DemoStateManager {
    if (!DemoStateManager.instance) {
      DemoStateManager.instance = new DemoStateManager();
    }
    return DemoStateManager.instance;
  }

  enableDemoMode(scenarioId?: string): void {
    this.demoMode = true;
    if (scenarioId) {
      this.setScenario(scenarioId);
    }
    localStorage.setItem('demo-mode', 'true');
  }

  disableDemoMode(): void {
    this.demoMode = false;
    this.currentScenario = null;
    localStorage.removeItem('demo-mode');
    localStorage.removeItem('demo-scenario');
    localStorage.removeItem('demo-filters');
    localStorage.removeItem('demo-user-type');
  }

  setScenario(scenarioId: string): void {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      this.currentScenario = scenarioId;
      scenario.setup();
    }
  }

  isDemoMode(): boolean {
    return this.demoMode || localStorage.getItem('demo-mode') === 'true';
  }

  getCurrentScenario(): string | null {
    return this.currentScenario || localStorage.getItem('demo-scenario');
  }

  getDemoFilters(): any {
    const stored = localStorage.getItem('demo-filters');
    return stored ? JSON.parse(stored) : {};
  }

  getDemoUserType(): 'basic' | 'premium' | 'expert' {
    return (localStorage.getItem('demo-user-type') as any) || 'basic';
  }
}

/**
 * Enhanced metrics for demo presentations
 */
export function getEnhancedDemoMetrics() {
  const baseMetrics = getDemoEngagementMetrics();
  const scenario = DemoStateManager.getInstance().getCurrentScenario();

  // Adjust metrics based on demo scenario
  switch (scenario) {
    case 'civic-engagement':
      return {
        ...baseMetrics,
        activeToday: Math.floor(baseMetrics.activeToday * 1.3),
        commentsToday: Math.floor(baseMetrics.commentsToday * 1.5),
        engagementRate: '78%',
        retentionRate: '65%',
      };

    case 'transparency-tech':
      return {
        ...baseMetrics,
        aiAnalysisCount: 47,
        workaroundsDetected: 8,
        accuracyRate: '98.2%',
        processingSpeed: '< 2 seconds',
      };

    case 'market-opportunity':
      return {
        ...baseMetrics,
        monthlyGrowth: '23%',
        premiumConversion: '12%',
        apiRequests: '1.2M/month',
        partnerIntegrations: 15,
      };

    default:
      return baseMetrics;
  }
}

/**
 * Demo-aware bill filtering
 */
export function getDemoBills(filters: any = {}) {
  const demoManager = DemoStateManager.getInstance();

  if (demoManager.isDemoMode()) {
    const demoFilters = demoManager.getDemoFilters();
    const combinedFilters = { ...demoFilters, ...filters };
    return filterDemoBills(combinedFilters);
  }

  return filterDemoBills(filters);
}

/**
 * Generate realistic activity feed for demos
 */
export function getDemoActivityFeed() {
  const activities = [
    {
      id: 1,
      type: 'bill_update',
      title: 'Climate Action Act passed committee review',
      description: 'SB-2024-042 advanced to floor vote with amendments',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      priority: 'high',
    },
    {
      id: 2,
      type: 'expert_analysis',
      title: 'New constitutional analysis available',
      description: 'Dr. Martinez published analysis on Digital Privacy Act',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
      priority: 'medium',
    },
    {
      id: 3,
      type: 'community_milestone',
      title: 'Community engagement milestone reached',
      description: '1,000+ citizens participated in Healthcare Act discussion',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
      priority: 'medium',
    },
    {
      id: 4,
      type: 'workaround_detected',
      title: 'Implementation workaround flagged',
      description: 'AI system detected potential bypass in Education Technology Act',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
      priority: 'high',
    },
  ];

  return activities.slice(0, Math.floor(Math.random() * 3) + 2); // Show 2-4 activities
}

/**
 * Demo notification system
 */
export function getDemoNotifications() {
  const notifications = [
    {
      id: 1,
      title: 'Bill Status Update',
      message: 'Climate Action Act moved to floor vote',
      type: 'bill_update',
      read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 2,
      title: 'Expert Analysis Available',
      message: 'Constitutional review completed for Digital Privacy Act',
      type: 'expert_analysis',
      read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
    {
      id: 3,
      title: 'Community Discussion',
      message: '15 new comments on Healthcare Access Act',
      type: 'community',
      read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
  ];

  return notifications.filter(n => !n.read || Math.random() > 0.5);
}

/**
 * Initialize demo mode based on URL parameters
 */
export function initializeDemoMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const demoParam = urlParams.get('demo');
  const scenarioParam = urlParams.get('scenario');

  if (demoParam === 'true' || demoParam === '1') {
    const demoManager = DemoStateManager.getInstance();
    demoManager.enableDemoMode(scenarioParam || undefined);

    // Remove demo params from URL to keep it clean
    urlParams.delete('demo');
    urlParams.delete('scenario');
    const newUrl =
      window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
}

// Auto-initialize demo mode on import
if (typeof window !== 'undefined') {
  initializeDemoMode();
}
