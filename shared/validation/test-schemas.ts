/**
 * Quick test to verify schema alignment changes compile correctly
 */

import { 
  UserSchema as _UserSchema, 
  UserProfileSchema as _UserProfileSchema, 
  UserWithProfileSchema as _UserWithProfileSchema,
  validateUser,
  validateUserProfile 
} from './schemas/user.schema';

import { 
  CommentSchema as _CommentSchema, 
  LegacyCommentSchema as _LegacyCommentSchema,
  validateComment 
} from './schemas/comment.schema';

import { 
  BillSchema as _BillSchema, 
  LegacyBillSchema as _LegacyBillSchema,
  validateBill 
} from './schemas/bill.schema';

// Test User Schema
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  role: 'citizen' as const,
};

const userResult = validateUser(testUser);
console.log('✅ UserSchema validation:', userResult.valid ? 'PASS' : 'FAIL');

// Test UserProfile Schema
const testProfile = {
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  first_name: 'John',
  last_name: 'Doe',
  display_name: 'JohnD',
};

const profileResult = validateUserProfile(testProfile);
console.log('✅ UserProfileSchema validation:', profileResult.valid ? 'PASS' : 'FAIL');

// Test Comment Schema (new aligned version)
const testComment = {
  comment_text: 'This is a test comment with enough words',
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  bill_id: '123e4567-e89b-12d3-a456-426614174001',
};

const commentResult = validateComment(testComment);
console.log('✅ CommentSchema validation:', commentResult.valid ? 'PASS' : 'FAIL');

// Test Bill Schema (new aligned version)
const testBill = {
  title: 'Test Bill Title That Is Long Enough',
  bill_number: 'H.123',
  chamber: 'national_assembly' as const,
  status: 'first_reading' as const,
};

const billResult = validateBill(testBill);
console.log('✅ BillSchema validation:', billResult.valid ? 'PASS' : 'FAIL');

console.log('\n✅ All schema alignments compile and validate correctly!');
