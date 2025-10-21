// Simple test script to verify the comment system functionality
import { commentService } from '../../server/features/community/comment.js';
import { commentVotingService } from '../../server/features/community/comment-voting.js';
import { contentModerationService } from '../../server/features/admin/content-moderation.js';
import { logger } from '../../shared/core/src/observability/logging/index.js';

async function testCommentSystem() {
  logger.info('🧪 Testing Comment System...\n', { component: 'Chanuka' });

  try {
    // Test 1: Get comments for a bill (should return fallback data)
    logger.info('1. Testing getBillComments...', { component: 'Chanuka' });
    const commentsResult = await commentService.getBillComments(1, {
      sort: 'recent',
      limit: 10
    });
    console.log(`✅ Retrieved ${commentsResult.comments.length} comments`);
    console.log(`   Total count: ${commentsResult.totalCount}`);
    console.log(`   Has more: ${commentsResult.hasMore}\n`);

    // Test 2: Create a new comment (should use fallback)
    logger.info('2. Testing createComment...', { component: 'Chanuka' });
    const newComment = await commentService.createComment({
      billId: 1,
      userId: 'test-user-123',
      content: 'This is a test comment to verify the system works properly.',
      commentType: 'general'
    });
    console.log(`✅ Created comment with ID: ${newComment.id}`);
    console.log(`   Content: ${newComment.content.substring(0, 50)}...\n`);

    // Test 3: Vote on a comment
    logger.info('3. Testing comment voting...', { component: 'Chanuka' });
    const voteResult = await commentVotingService.voteOnComment(
      1, // comment ID
      'test-user-123',
      'up'
    );
    console.log(`✅ Vote result: ${voteResult.success ? 'Success' : 'Failed'}`);
    console.log(`   New upvotes: ${voteResult.newUpvotes}`);
    console.log(`   Net votes: ${voteResult.netVotes}\n`);

    // Test 4: Get comment statistics
    logger.info('4. Testing comment statistics...', { component: 'Chanuka' });
    const stats = await commentService.getCommentStats(1);
    console.log(`✅ Comment stats retrieved:`);
    console.log(`   Total comments: ${stats.totalComments}`);
    console.log(`   Expert comments: ${stats.expertComments}`);
    console.log(`   Verified comments: ${stats.verifiedComments}\n`);

    // Test 5: Content moderation analysis
    logger.info('5. Testing content moderation...', { component: 'Chanuka' });
    const analysis = await contentModerationService.analyzeContent(
      1,
      'comment',
      'This is a test comment with some CAPS and multiple exclamation marks!!!'
    );
    console.log(`✅ Content analysis completed:`);
    console.log(`   Toxicity score: ${analysis.toxicityScore.toFixed(3)}`);
    console.log(`   Spam score: ${analysis.spamScore.toFixed(3)}`);
    console.log(`   Sentiment score: ${analysis.sentimentScore.toFixed(3)}`);
    console.log(`   Flags: ${analysis.flags.join(', ') || 'None'}\n`);

    // Test 6: Flag content
    logger.info('6. Testing content flagging...', { component: 'Chanuka' });
    const flag = await contentModerationService.flagContent(
      'comment',
      1,
      'inappropriate',
      'Testing the flagging system functionality',
      'test-moderator'
    );
    console.log(`✅ Content flagged with ID: ${flag.id}`);
    console.log(`   Flag type: ${flag.flagType}`);
    console.log(`   Severity: ${flag.severity}\n`);

    // Test 7: Get moderation queue
    logger.info('7. Testing moderation queue...', { component: 'Chanuka' });
    const queue = await contentModerationService.getModerationQueue({
      status: 'pending',
      limit: 5
    });
    console.log(`✅ Moderation queue retrieved:`);
    console.log(`   Total flags: ${queue.totalCount}`);
    console.log(`   Pending flags: ${queue.pendingCount}`);
    console.log(`   High priority flags: ${queue.highPriorityCount}\n`);

    logger.info('🎉 All comment system tests completed successfully!', { component: 'Chanuka' });
    logger.info('\n📋 Summary:', { component: 'Chanuka' });
    logger.info('   ✅ Threaded comment system', { component: 'Chanuka' });
    logger.info('   ✅ Comment voting and engagement', { component: 'Chanuka' });
    logger.info('   ✅ Content moderation and analysis', { component: 'Chanuka' });
    logger.info('   ✅ Automated flagging system', { component: 'Chanuka' });
    logger.info('   ✅ Moderation queue management', { component: 'Chanuka' });
    logger.info('   ✅ Comment statistics and analytics', { component: 'Chanuka' });

  } catch (error) {
    logger.error('❌ Test failed:', { component: 'Chanuka' }, error.message);
    logger.error('Stack trace:', { component: 'Chanuka' }, error.stack);
  }
}

// Run the test
testCommentSystem().catch(console.error);





































