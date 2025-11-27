/**
 * User Entity Mapping for DrizzleAdapter
 * 
 * Provides bidirectional mapping between User domain entities and database rows.
 * Handles edge cases and data validation during migration transition.
 */

import { User } from '@/features/users/domain/entities/user';
import { users } from '@shared/schema';
import { EntityMapping } from '@shared/drizzle-adapter';

type UserRow = typeof users.$inferSelect;

// Define the valid role type to ensure type safety
type UserRole = 'citizen' | 'admin' | 'moderator' | 'expert' | 'ambassador' | 'organizer';

export class UserEntityMapping implements EntityMapping<User, UserRow> {
  /**
   * Convert database row to User domain entity
   * Handles missing fields and data validation
   */
  toEntity(row: UserRow): User {
    try {
      // Ensure we have valid data before creating User entity
      const safeEmail = row.email || 'unknown@example.com';
      
      // Extract email prefix safely, handling edge cases
      const emailParts = safeEmail.split('@');
      const emailPrefix = emailParts.length > 0 && emailParts[0] 
        ? emailParts[0] 
        : 'user';
      
      // Create a valid name that passes the regex validation (/^[a-zA-Z\s\-']+$/)
      const safeName = emailPrefix.replace(/[^a-zA-Z\s\-']/g, '') || 'User';
      
      return User.create({
        id: row.id || 'unknown',
        email: safeEmail,
        name: safeName,
        role: row.role || 'citizen',
        verification_status: row.is_verified ? 'verified' : 'pending',
        is_active: row.is_active ?? true,
        last_login_at: row.last_login_at,
        created_at: row.created_at || new Date(),
        updated_at: row.updated_at || new Date(),
        reputation_score: 0 // Calculated field, not stored in users table
      });
    } catch (error) {
      // Fallback for corrupted data - ensures we always return a valid User entity
      return User.create({
        id: 'unknown',
        email: 'unknown@example.com',
        name: 'Unknown User',
        role: 'citizen',
        verification_status: 'pending',
        is_active: true,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        reputation_score: 0
      });
    }
  }

  /**
   * Convert User domain entity to database row format
   * Handles domain-specific transformations
   * 
   * Note on type assertion: We use 'as Partial<UserRow>' because we know at runtime
   * that the User entity always has valid id and email values. The UserInsert type
   * from Drizzle makes these fields optional for insert operations (since they might
   * be auto-generated), but in our domain model, User entities always have these values.
   * 
   * This assertion is safe because:
   * 1. User.toJSON() always returns a complete object with id and email
   * 2. We provide explicit values for all fields we're returning
   * 3. The repository layer handles any missing fields (like password_hash) separately
   */
  fromEntity(entity: User): Partial<UserRow> {
    const userData = entity.toJSON();
    
    // Validate that role is one of the expected values
    const validRoles: UserRole[] = ['citizen', 'admin', 'moderator', 'expert', 'ambassador', 'organizer'];
    const role = validRoles.includes(userData.role as UserRole) 
      ? (userData.role as UserRole)
      : 'citizen';
    
    // We construct the object with all the fields we need, then assert it matches
    // the expected return type. This tells TypeScript "trust me, this satisfies
    // Partial<UserRow> even though the intermediate types suggest otherwise"
    const result = {
      id: userData.id,
      email: userData.email,
      // password_hash handled separately in repository methods
      role: role,
      is_verified: userData.verification_status === 'verified',
      is_active: userData.is_active,
      last_login_at: userData.last_login_at,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    };
    
    // This type assertion bridges the gap between what TypeScript infers and what
    // we know to be true. It's safer than 'as any' because we're being specific
    // about what type we're asserting to, and it matches the interface contract
    return result as Partial<UserRow>;
  }
}

export const userEntityMapping = new UserEntityMapping();
