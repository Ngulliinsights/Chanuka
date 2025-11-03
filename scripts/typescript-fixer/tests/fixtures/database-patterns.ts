/**
 * Test fixtures representing actual Chanuka database usage patterns
 * These examples are based on real patterns found in the codebase
 */

export const DATABASE_FIXTURES = {
  // Missing database connection import
  MISSING_DATABASE_IMPORT: `
// This should trigger: Cannot find name 'database'
const users = await database.select().from(usersTable).where(eq(usersTable.active, true));
`,

  // Missing withTransaction import
  MISSING_TRANSACTION_IMPORT: `
// This should trigger: Cannot find name 'withTransaction'
const result = await withTransaction(async (tx) => {
  const [user] = await tx.insert(users).values({ 
    name: 'John Doe', 
    email: 'john@example.com' 
  }).returning();
  
  await tx.insert(user_profiles).values({
    userId: user.id,
    bio: 'Software engineer'
  });
  
  return user;
});
`,

  // Missing databaseService import
  MISSING_DATABASE_SERVICE: `
// This should trigger: Cannot find name 'databaseService'
const result = await databaseService.withFallback(
  async () => {
    return await database.select()
      .from(bills)
      .where(eq(bills.status, 'active'))
      .limit(10);
  },
  [],
  'get_active_bills'
);
`,

  // Missing Drizzle ORM imports
  MISSING_DRIZZLE_IMPORTS: `
import { database } from '@shared/database/connection';

// This should trigger: Cannot find name 'eq', 'and', 'desc'
const users = await database.select()
  .from(usersTable)
  .where(and(
    eq(usersTable.active, true),
    eq(usersTable.verified, true)
  ))
  .orderBy(desc(usersTable.createdAt));
`,

  // Incorrect relative import paths
  INCORRECT_RELATIVE_PATHS: `
// This should trigger: Cannot find module '../../../shared/database/connection'
import { database, withTransaction } from '../../../shared/database/connection';
import { databaseService } from '../../infrastructure/database/database-service';

const result = await withTransaction(async (tx) => {
  return await databaseService.withFallback(
    () => tx.select().from(users),
    [],
    'get_users'
  );
});
`,

  // Mixed database patterns (realistic Chanuka usage)
  REALISTIC_CHANUKA_PATTERN: `
import { database } from '@shared/database/connection';
import { users, bills, bill_engagement } from '@shared/schema';

// Missing: eq, and, desc, count, withTransaction
export class UserEngagementService {
  async getUserEngagement(userId: string) {
    return await withTransaction(async (tx) => {
      const user = await tx.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        throw new Error('User not found');
      }

      const engagementStats = await tx.select({
        billId: bill_engagement.billId,
        engagementType: bill_engagement.engagementType,
        createdAt: bill_engagement.createdAt
      })
      .from(bill_engagement)
      .where(and(
        eq(bill_engagement.userId, userId),
        eq(bill_engagement.active, true)
      ))
      .orderBy(desc(bill_engagement.createdAt));

      const totalEngagements = await tx.select({
        count: count()
      })
      .from(bill_engagement)
      .where(eq(bill_engagement.userId, userId));

      return {
        user: user[0],
        engagements: engagementStats,
        totalCount: totalEngagements[0].count
      };
    });
  }
}
`,

  // Database service with fallback pattern
  DATABASE_SERVICE_FALLBACK: `
import { readDatabase } from '@shared/database/connection';
import { bills, sponsors } from '@shared/schema';

// Missing: databaseService, eq, sql
export class BillAnalyticsService {
  async getBillAnalytics(billId: string) {
    return await databaseService.withFallback(
      async () => {
        return await readDatabase.select({
          billId: bills.id,
          title: bills.title,
          sponsorCount: sql<number>\`count(\${sponsors.id})\`
        })
        .from(bills)
        .leftJoin(sponsors, eq(bills.id, sponsors.billId))
        .where(eq(bills.id, billId))
        .groupBy(bills.id);
      },
      null,
      'get_bill_analytics'
    );
  }
}
`,

  // Unused database imports
  UNUSED_DATABASE_IMPORTS: `
import { database, withTransaction, readDatabase } from '@shared/database/connection';
import { eq, and, or } from 'drizzle-orm';
import { users } from '@shared/schema';

// Only using 'users' and 'eq' - others should be removed
export async function getActiveUsers() {
  return await database.select()
    .from(users)
    .where(eq(users.active, true));
}
`,

  // Complex transaction with multiple database operations
  COMPLEX_TRANSACTION_PATTERN: `
import { writeDatabase } from '@shared/database/connection';
import { users, user_profiles, notifications } from '@shared/schema';

// Missing: withTransaction, eq, and, sql
export class UserRegistrationService {
  async registerUser(userData: any) {
    return await withTransaction(async (tx) => {
      // Create user
      const [newUser] = await tx.insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          active: true,
          createdAt: sql\`NOW()\`
        })
        .returning();

      // Create profile
      await tx.insert(user_profiles)
        .values({
          userId: newUser.id,
          bio: userData.bio || '',
          preferences: userData.preferences || {}
        });

      // Create welcome notification
      await tx.insert(notifications)
        .values({
          userId: newUser.id,
          type: 'welcome',
          message: 'Welcome to Chanuka!',
          read: false,
          createdAt: sql\`NOW()\`
        });

      // Verify user was created
      const verifyUser = await tx.select()
        .from(users)
        .where(and(
          eq(users.id, newUser.id),
          eq(users.active, true)
        ))
        .limit(1);

      if (!verifyUser.length) {
        throw new Error('User registration failed');
      }

      return newUser;
    });
  }
}
`,

  // Health check and monitoring patterns
  HEALTH_CHECK_PATTERN: `
// Missing: checkDatabaseHealth, databaseService
export class DatabaseHealthService {
  async getSystemHealth() {
    const dbHealth = await checkDatabaseHealth();
    const serviceStatus = databaseService.getConnectionStatus();
    
    return {
      database: dbHealth,
      service: serviceStatus,
      timestamp: new Date().toISOString()
    };
  }
}
`,

  // Multiple database connections pattern
  MULTI_DATABASE_PATTERN: `
// Missing: readDatabase, writeDatabase, operationalDb, analyticsDb
export class DataAccessService {
  async getAnalyticsData() {
    return await readDatabase.select()
      .from(bill_engagement)
      .where(eq(bill_engagement.active, true));
  }

  async writeUserData(userData: any) {
    return await writeDatabase.insert(users)
      .values(userData)
      .returning();
  }

  async getOperationalMetrics() {
    return await operationalDb.select()
      .from(users)
      .where(eq(users.active, true));
  }

  async getAnalyticsMetrics() {
    return await analyticsDb.select({
      count: count()
    })
    .from(bill_engagement);
  }
}
`
};

export const EXPECTED_FIXES = {
  // Expected imports for each fixture
  MISSING_DATABASE_IMPORT: [
    "import { database } from '@shared/database/connection';",
    "import { eq } from 'drizzle-orm';"
  ],

  MISSING_TRANSACTION_IMPORT: [
    "import { withTransaction } from '@shared/database/connection';"
  ],

  MISSING_DATABASE_SERVICE: [
    "import { databaseService } from '@shared/database';"
  ],

  MISSING_DRIZZLE_IMPORTS: [
    "import { eq, and, desc } from 'drizzle-orm';"
  ],

  REALISTIC_CHANUKA_PATTERN: [
    "import { eq, and, desc, count, withTransaction } from 'drizzle-orm';",
    "import { withTransaction } from '@shared/database/connection';"
  ],

  DATABASE_SERVICE_FALLBACK: [
    "import { databaseService } from '@shared/database';",
    "import { eq, sql } from 'drizzle-orm';"
  ],

  COMPLEX_TRANSACTION_PATTERN: [
    "import { withTransaction } from '@shared/database/connection';",
    "import { eq, and, sql } from 'drizzle-orm';"
  ],

  HEALTH_CHECK_PATTERN: [
    "import { checkDatabaseHealth } from '@shared/database/connection';",
    "import { databaseService } from '@shared/database';"
  ],

  MULTI_DATABASE_PATTERN: [
    "import { readDatabase, writeDatabase, operationalDb, analyticsDb } from '@shared/database/connection';",
    "import { eq, count } from 'drizzle-orm';"
  ]
};