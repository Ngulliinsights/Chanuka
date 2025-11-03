import { database as db } from '@shared/database/connection';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { UserRepository } from '../../domain/repositories/user-repository';
import { User } from '../../domain/entities/user';

export class UserRepositoryImpl implements UserRepository {
  /**
   * Maps database row to User domain entity with proper type safety
   */
  private mapToUser(row: typeof users.$inferSelect): User {
    return User.create({
      id: row.id,
      email: row.email,
      name: row.email, // Use email as name since display_name/first_name/last_name not in users table
      role: row.role,
      verification_status: row.is_verified ? 'verified' : 'pending',
      is_active: row.is_active,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reputation_score: 0 // Calculated field, not stored in users table
    });
  }

  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  async save(user: User, password_hash?: string): Promise<void> {
    const userData = user.toJSON();

    const insertPayload = {
      id: userData.id,
      email: userData.email,
      password_hash: password_hash || '',
      role: userData.role,
      is_verified: userData.verification_status === 'verified',
      is_active: userData.is_active,
      last_login_at: userData.last_login_at,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    };

    await db.insert(users).values(insertPayload);
  }

  async update(user: User): Promise<void> {
    const userData = user.toJSON();

    await db
      .update(users)
      .set({
        email: userData.email,
        role: userData.role,
        is_verified: userData.verification_status === 'verified',
        is_active: userData.is_active,
        last_login_at: userData.last_login_at,
        updated_at: userData.updated_at
      })
      .where(eq(users.id, userData.id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async findUsersByRole(role: string): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.role, role));

    return results.map(result => this.mapToUser(result));
  }

  async findUsersByVerificationStatus(status: string): Promise<User[]> {
    const isVerified = status === 'verified';
    const results = await db
      .select()
      .from(users)
      .where(eq(users.is_verified, isVerified));

    return results.map(result => this.mapToUser(result));
  }

  async findUsersByReputationRange(min: number, max: number): Promise<User[]> {
    // Reputation is not stored in users table - would require domain service coordination
    // Return empty array as per repository pattern focus on single aggregate root
    return [];
  }

  async searchUsers(query: string, limit = 10): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await db
      .select()
      .from(users)
      .where(
        sql`LOWER(${users.email}) LIKE ${searchTerm}`
      )
      .limit(limit);

    return results.map(result => this.mapToUser(result));
  }

  async countUsers(): Promise<number> {
    const result = await db
      .select({ value: sql<number>`count(*)` })
      .from(users);

    return Number(result[0]?.value ?? 0);
  }

  async countUsersByRole(): Promise<Record<string, number>> {
    const results = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.role);

    const roleCounts: Record<string, number> = {};
    results.forEach(result => {
      roleCounts[result.role] = Number(result.count);
    });

    return roleCounts;
  }

  async countUsersByVerificationStatus(): Promise<Record<string, number>> {
    const results = await db
      .select({
        status: sql<string>`CASE WHEN ${users.is_verified} THEN 'verified' ELSE 'pending' END`,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.is_verified);

    const statusCounts: Record<string, number> = {};
    results.forEach(result => {
      statusCounts[result.status] = Number(result.count);
    });

    return statusCounts;
  }

  // Removed aggregate operations - these should be handled by domain services
  // that coordinate multiple repositories within transactions
}
