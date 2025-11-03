// Sample TypeScript file with typical Chanuka project patterns
// This file contains intentional errors for testing the schema import detector

// Missing imports that should be detected:
// - users, bills from '@shared/schema/foundation'
// - eq, and, desc from 'drizzle-orm'

export async function getUserBills(userId: string) {
  // Missing schema table imports
  const userBills = await db
    .select({
      id: bills.id,
      title: bills.title,
      summary: bills.summary,
      status: bills.status,
      user_email: users.email, // Valid property
      user_role: users.role,   // Valid property
      invalid_prop: users.nonexistent_field // Invalid property - should be detected
    })
    .from(bills)
    .leftJoin(users, eq(bills.sponsor_id, users.id))
    .where(
      and(
        eq(users.id, userId),
        eq(bills.status, 'active')
      )
    )
    .orderBy(desc(bills.created_at));

  return userBills;
}

export async function getUserComments(userId: string) {
  // Missing comments import from citizen_participation schema
  const userComments = await db
    .select()
    .from(comments)
    .where(eq(comments.user_id, userId))
    .orderBy(desc(comments.created_at));

  return userComments;
}

// Function with incorrect Drizzle usage
export async function getBillsWithInvalidSyntax() {
  // These should trigger Drizzle pattern issues
  const bills = await db
    .select()
    .from(bills)
    .where(
      eq(bills.status), // Missing second argument
      and(eq(bills.id, 1)), // and() needs at least 2 arguments
      inArray(bills.sponsor_id), // Missing array argument
      between(bills.created_at, new Date()) // Missing max date argument
    );

  return bills;
}

// Type usage that should be detected
export interface UserBillData {
  user: User; // Should detect missing User type import
  bill: Bill; // Should detect missing Bill type import
  comments: Comment[]; // Should detect missing Comment type import
}

// Function using raw operators instead of Drizzle functions
export async function getBillsWithRawOperators(status: string) {
  // These binary expressions should suggest using Drizzle functions
  const bills = await db
    .select()
    .from(bills)
    .where(
      bills.status === status, // Should suggest eq()
      bills.id !== null,       // Should suggest ne() or isNotNull()
      bills.created_at > new Date() // Should suggest gt()
    );

  return bills;
}

// Complex nested query with multiple issues
export async function complexQueryWithIssues() {
  const result = await db
    .select({
      bill_title: bills.title,
      bill_summary: bills.summary,
      sponsor_name: sponsors.name, // Missing sponsors import
      sponsor_party: sponsors.party,
      comment_count: count(comments.id),
      user_county: user_profiles.county // Missing user_profiles import
    })
    .from(bills)
    .leftJoin(sponsors, eq(bills.sponsor_id, sponsors.id))
    .leftJoin(comments, eq(comments.bill_id, bills.id))
    .leftJoin(users, eq(comments.user_id, users.id))
    .leftJoin(user_profiles, eq(user_profiles.user_id, users.id))
    .where(
      and(
        eq(bills.status, 'active'),
        or(
          like(bills.title, '%budget%'),
          like(bills.summary, '%finance%')
        ),
        inArray(sponsors.party, ['Jubilee', 'ODM', 'UDA'])
      )
    )
    .groupBy(bills.id, sponsors.id)
    .orderBy(desc(count(comments.id)));

  return result;
}

// Function with property access on unknown table
export async function accessUnknownTable() {
  // This should detect that 'unknown_table' is not a valid schema table
  const result = await db
    .select()
    .from(unknown_table)
    .where(eq(unknown_table.some_field, 'value'));

  return result;
}