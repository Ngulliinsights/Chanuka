/**
 * Community Data Integration Demo Script
 * 
 * Demonstrates the community data integration functionality without
 * requiring a full build. This script shows how the various components
 * work together to provide real-time community features.
 */

import { communityWebSocketMiddleware } from '../services/community-websocket-middleware';
import { communityBackendService } from '../services/community-backend-service';
import { notificationService } from '../services/notification-service';
import { logger } from '../utils/logger';

/**
 * Demo class to showcase community data integration
 */
class CommunityIntegrationDemo {
  private isInitialized = false;
  private demoData = {
    billId: 1,
    userId: 'demo-user',
    userName: 'Demo User',
  };

  /**
   * Initialize the demo
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Community Data Integration Demo...');

      // Step 1: Initialize community WebSocket middleware
      console.log('📡 Initializing WebSocket middleware...');
      await communityWebSocketMiddleware.initialize({
        enableDiscussions: true,
        enableExpertUpdates: true,
        enableCommunityAnalytics: true,
        enableModerationEvents: true,
        enableNotifications: true,
      });

      // Step 2: Initialize backend service
      console.log('🔧 Initializing backend service...');
      await communityBackendService.initialize();

      // Step 3: Initialize notification service
      console.log('🔔 Initializing notification service...');
      await notificationService.initialize();

      // Step 4: Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Community data integration initialized successfully!');

      // Step 5: Run demo scenarios
      await this.runDemoScenarios();

    } catch (error) {
      console.error('❌ Failed to initialize community data integration:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for real-time updates
   */
  private setupEventListeners(): void {
    console.log('👂 Setting up event listeners...');

    // Listen for discussion updates
    window.addEventListener('community:comment_added', (event: CustomEvent) => {
      console.log('💬 New comment added:', event.detail);
    });

    window.addEventListener('community:comment_updated', (event: CustomEvent) => {
      console.log('✏️ Comment updated:', event.detail);
    });

    window.addEventListener('community:comment_voted', (event: CustomEvent) => {
      console.log('👍 Comment voted:', event.detail);
    });

    window.addEventListener('community:typing_indicator', (event: CustomEvent) => {
      console.log('⌨️ Typing indicator:', event.detail);
    });

    // Listen for expert updates
    window.addEventListener('community:expert_verification_updated', (event: CustomEvent) => {
      console.log('🎓 Expert verification updated:', event.detail);
    });

    window.addEventListener('community:expert_insight_added', (event: CustomEvent) => {
      console.log('💡 Expert insight added:', event.detail);
    });

    // Listen for community analytics
    window.addEventListener('community:activity_update', (event: CustomEvent) => {
      console.log('📊 Community activity update:', event.detail);
    });

    window.addEventListener('community:trending_update', (event: CustomEvent) => {
      console.log('🔥 Trending topics updated:', event.detail);
    });

    // Listen for moderation events
    window.addEventListener('community:comment_reported', (event: CustomEvent) => {
      console.log('🚨 Comment reported:', event.detail);
    });

    window.addEventListener('community:moderation_action', (event: CustomEvent) => {
      console.log('⚖️ Moderation action taken:', event.detail);
    });

    console.log('✅ Event listeners set up successfully!');
  }

  /**
   * Run demo scenarios to showcase functionality
   */
  private async runDemoScenarios(): Promise<void> {
    console.log('\n🎭 Running demo scenarios...\n');

    // Scenario 1: Discussion participation
    await this.demoDiscussionParticipation();

    // Scenario 2: Expert insights
    await this.demoExpertInsights();

    // Scenario 3: Real-time notifications
    await this.demoNotifications();

    // Scenario 4: Community analytics
    await this.demoCommunityAnalytics();

    console.log('\n🎉 All demo scenarios completed successfully!');
  }

  /**
   * Demo discussion participation
   */
  private async demoDiscussionParticipation(): Promise<void> {
    console.log('📝 Demo Scenario 1: Discussion Participation');

    try {
      // Subscribe to discussion updates
      communityWebSocketMiddleware.subscribeToDiscussion(this.demoData.billId);
      console.log(`   ✓ Subscribed to discussion for Bill #${this.demoData.billId}`);

      // Simulate typing indicator
      communityWebSocketMiddleware.sendTypingIndicator(this.demoData.billId);
      console.log('   ✓ Sent typing indicator');

      // Wait a moment
      await this.delay(1000);

      // Stop typing indicator
      communityWebSocketMiddleware.stopTypingIndicator(this.demoData.billId);
      console.log('   ✓ Stopped typing indicator');

      // Simulate adding a comment (this would normally go through the backend)
      const commentData = {
        billId: this.demoData.billId,
        content: 'This is a demo comment showing real-time integration!',
        parentId: undefined,
      };

      console.log('   ✓ Simulated comment submission:', commentData);

      // Simulate real-time comment event
      this.simulateCommentAdded({
        billId: this.demoData.billId,
        comment: {
          id: `demo-comment-${Date.now()}`,
          content: commentData.content,
          authorId: this.demoData.userId,
          authorName: this.demoData.userName,
          createdAt: new Date().toISOString(),
          upvotes: 0,
          downvotes: 0,
          replies: [],
          parentId: null,
          isEdited: false,
          isModerated: false,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('   ❌ Discussion participation demo failed:', error);
    }

    console.log('   ✅ Discussion participation demo completed\n');
  }

  /**
   * Demo expert insights
   */
  private async demoExpertInsights(): Promise<void> {
    console.log('🎓 Demo Scenario 2: Expert Insights');

    try {
      // Simulate expert verification update
      this.simulateExpertVerificationUpdate({
        userId: 'expert-user-123',
        verificationType: 'domain',
        credibilityScore: 85,
        timestamp: new Date().toISOString(),
      });

      // Wait a moment
      await this.delay(500);

      // Simulate expert insight added
      this.simulateExpertInsightAdded({
        billId: this.demoData.billId,
        insight: {
          id: `demo-insight-${Date.now()}`,
          billId: this.demoData.billId,
          expertId: 'expert-user-123',
          title: 'Constitutional Analysis of Healthcare Reform',
          content: 'This bill raises important constitutional questions regarding federal vs state authority...',
          category: 'constitutional',
          severity: 'high',
          tags: ['constitutional', 'healthcare', 'federalism'],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

      console.log('   ✓ Simulated expert verification and insight');

    } catch (error) {
      console.error('   ❌ Expert insights demo failed:', error);
    }

    console.log('   ✅ Expert insights demo completed\n');
  }

  /**
   * Demo notifications
   */
  private async demoNotifications(): Promise<void> {
    console.log('🔔 Demo Scenario 3: Real-time Notifications');

    try {
      // Get current notification count
      const initialCount = notificationService.getUnreadCount();
      console.log(`   ✓ Initial unread notifications: ${initialCount}`);

      // Simulate community notification
      window.dispatchEvent(new CustomEvent('communityNotification', {
        detail: {
          type: 'expert_response',
          title: 'Expert Response to Your Comment',
          message: 'Dr. Smith has responded to your comment on Healthcare Reform',
          data: {
            billId: this.demoData.billId,
            commentId: 'demo-comment-123',
            expertId: 'expert-user-123',
          },
          timestamp: new Date().toISOString(),
        },
      }));

      console.log('   ✓ Simulated community notification');

      // Wait a moment
      await this.delay(500);

      // Check updated notification count
      const updatedCount = notificationService.getUnreadCount();
      console.log(`   ✓ Updated unread notifications: ${updatedCount}`);

    } catch (error) {
      console.error('   ❌ Notifications demo failed:', error);
    }

    console.log('   ✅ Notifications demo completed\n');
  }

  /**
   * Demo community analytics
   */
  private async demoCommunityAnalytics(): Promise<void> {
    console.log('📊 Demo Scenario 4: Community Analytics');

    try {
      // Simulate activity update
      this.simulateActivityUpdate({
        type: 'new_activity',
        data: {
          activityType: 'comment_added',
          billId: this.demoData.billId,
          userId: this.demoData.userId,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

      // Wait a moment
      await this.delay(500);

      // Simulate trending update
      this.simulateTrendingUpdate({
        topics: [
          { id: '1', title: 'Healthcare Reform', score: 95, trend: 'up' },
          { id: '2', title: 'Education Funding', score: 87, trend: 'stable' },
          { id: '3', title: 'Infrastructure Investment', score: 78, trend: 'down' },
        ],
        timestamp: new Date().toISOString(),
      });

      console.log('   ✓ Simulated community analytics updates');

    } catch (error) {
      console.error('   ❌ Community analytics demo failed:', error);
    }

    console.log('   ✅ Community analytics demo completed\n');
  }

  /**
   * Simulate comment added event
   */
  private simulateCommentAdded(data: any): void {
    window.dispatchEvent(new CustomEvent('community:comment_added', { detail: data }));
  }

  /**
   * Simulate expert verification update
   */
  private simulateExpertVerificationUpdate(data: any): void {
    window.dispatchEvent(new CustomEvent('community:expert_verification_updated', { detail: data }));
  }

  /**
   * Simulate expert insight added
   */
  private simulateExpertInsightAdded(data: any): void {
    window.dispatchEvent(new CustomEvent('community:expert_insight_added', { detail: data }));
  }

  /**
   * Simulate activity update
   */
  private simulateActivityUpdate(data: any): void {
    window.dispatchEvent(new CustomEvent('community:activity_update', { detail: data }));
  }

  /**
   * Simulate trending update
   */
  private simulateTrendingUpdate(data: any): void {
    window.dispatchEvent(new CustomEvent('community:trending_update', { detail: data }));
  }

  /**
   * Utility method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  getStatus(): { isInitialized: boolean; isConnected: boolean } {
    return {
      isInitialized: this.isInitialized,
      isConnected: communityWebSocketMiddleware.isConnected(),
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.isInitialized) {
      communityWebSocketMiddleware.cleanup();
      console.log('🧹 Community integration demo cleaned up');
    }
  }
}

// Export for use in other modules
export { CommunityIntegrationDemo };

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined') {
  const demo = new CommunityIntegrationDemo();
  
  // Add to global scope for manual testing
  (window as any).communityDemo = demo;
  
  console.log('🎯 Community Integration Demo loaded!');
  console.log('💡 Run "communityDemo.initialize()" to start the demo');
  console.log('📊 Run "communityDemo.getStatus()" to check status');
  console.log('🧹 Run "communityDemo.cleanup()" to clean up');
}